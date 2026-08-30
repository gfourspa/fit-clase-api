import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AutoAssignStudentResponseDto,
  BulkAddUsersResponseDto,
  UserAdminResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';
import { UserMapper } from './user.mapper';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { FirebaseUser } from '../auth/firebase-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces';
import {
  AddUsersToGymDto,
  AssignRoleDto,
  AutoAssignStudentDto,
} from './dto/user.dto';
import { UserService } from './users.service';
import { InvitationsService } from '../invitations/invitations.service';

/**
 * Users Controller
 *
 * Maneja los endpoints relacionados con la gestión de usuarios,
 * roles y sincronización con Firebase Auth siguiendo el flujo Flutter.
 */
@ApiTags('Usuarios')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly userService: UserService,
    private readonly invitationsService: InvitationsService,
  ) {}

  @Post('auto-assign-student')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Auto-asignar rol STUDENT',
    description:
      'Endpoint llamado desde Flutter para asignar automáticamente el rol STUDENT a nuevos usuarios usando una invitación.',
  })
  @ApiOkResponse({ type: AutoAssignStudentResponseDto })
  async autoAssignStudent(
    @Body() autoAssignDto: AutoAssignStudentDto,
    @FirebaseUser() currentUser: AuthenticatedUser,
  ): Promise<AutoAssignStudentResponseDto> {
    const result = await this.invitationsService.accept(
      currentUser,
      autoAssignDto.invitationToken,
    );

    return UserMapper.toAutoAssignStudentResponse(result.user);
  }

  @Post('assign-role')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Asignar rol a usuario',
    description: 'Permite a SUPER_ADMIN asignar cualquier rol a un usuario',
  })
  @ApiResponse({ status: 200, description: 'Rol asignado exitosamente' })
  @ApiOkResponse({ type: UserAdminResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo SUPER_ADMIN',
  })
  async assignRole(
    @Body() assignRoleDto: AssignRoleDto,
  ): Promise<UserAdminResponseDto> {
    const user = await this.userService.assignRole(assignRoleDto);
    return UserMapper.toAdminResponse(user);
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({
    summary: 'Obtener perfil del usuario autenticado',
    description: 'Retorna los datos del usuario a partir del token Firebase',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos del usuario obtenidos exitosamente',
  })
  @ApiOkResponse({
    description: 'Perfil o null si no existe',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/UserResponseDto' },
        { type: 'null' },
      ],
    },
  })
  @HttpCode(HttpStatus.OK)
  async getMyProfile(
    @FirebaseUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto | null> {
    const u = await this.userService.findByFirebaseUid(user.uid);
    if (!u) return null;
    return UserMapper.toResponse(u);
  }

  @Get()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar todos los usuarios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente',
  })
  @ApiOkResponse({ type: [UserAdminResponseDto] })
  @HttpCode(HttpStatus.OK)
  async getAllUsers(): Promise<UserAdminResponseDto[]> {
    const users = await this.userService.findAll();
    return users.map((user) => UserMapper.toAdminResponse(user));
  }

  @Post('sync')
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({ summary: 'Sincronizar usuario con BD' })
  @ApiOkResponse({ type: UserResponseDto })
  @HttpCode(HttpStatus.OK)
  async syncUser(
    @FirebaseUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const syncedUser = await this.userService.syncUser({
      uid: user.uid,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    return UserMapper.toResponse(syncedUser);
  }

  @Post('/:gymId/add-to-gym')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.OWNER_GYM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Agregar usuario a gimnasio' })
  @ApiOkResponse({ type: BulkAddUsersResponseDto })
  @HttpCode(HttpStatus.OK)
  async addUserToGym(
    @Body() body: AddUsersToGymDto,
    @Param('gymId', ParseUUIDPipe) gymId: string,
    @FirebaseUser() user: AuthenticatedUser,
  ): Promise<BulkAddUsersResponseDto> {
    const result = await this.userService.addUsersToGym(
      body.emails,
      gymId,
      user,
    );
    return UserMapper.toBulkAddUsersResponse(result);
  }
}
