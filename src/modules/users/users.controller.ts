import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { RolesGuard } from '../../common/guards/roles.guard';
import { User } from '../../entities/user.entity';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { FirebaseUser } from '../auth/firebase-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces';
import { AssignRoleDto, AutoAssignStudentDto } from './dto/user.dto';
import { UserService } from './users.service';

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
  constructor(private readonly userService: UserService) {}

  @Post('auto-assign-student')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Auto-asignar rol STUDENT', 
    description: 'Endpoint llamado desde Flutter para asignar automáticamente el rol STUDENT a nuevos usuarios' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Rol STUDENT asignado exitosamente',
    schema: {
      example: {
        uid: "firebase_uid_123",
        email: "usuario@ejemplo.com", 
        role: "STUDENT",
        gymId: "uuid-gym-456"
      }
    }
  })
  async autoAssignStudent(@Body() autoAssignDto: AutoAssignStudentDto): Promise<{
    uid: string;
    email: string;
    role: string;
    gymId: string;
  }> {
    const user = await this.userService.autoAssignStudent(
      autoAssignDto.uid,
      autoAssignDto.email,
      autoAssignDto.gymId
    );
    
    return {
      uid: user.firebase_uid || '',
      email: user.email,
      role: user.role,
      gymId: user.gymId || '',
    };
  }


  @Post('assign-role')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Asignar rol a usuario',
    description: 'Permite a SUPER_ADMIN asignar cualquier rol a un usuario' 
  })
  @ApiResponse({ status: 200, description: 'Rol asignado exitosamente' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - Solo SUPER_ADMIN' })
  async assignRole(@Body() assignRoleDto: AssignRoleDto): Promise<User> {
    return this.userService.assignRole(assignRoleDto);
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({ 
    summary: 'Obtener perfil del usuario autenticado',
    description: 'Retorna los datos del usuario a partir del token Firebase' 
  })
  @ApiResponse({ status: 200, description: 'Datos del usuario obtenidos exitosamente' })
  @HttpCode(HttpStatus.OK)
  async getMyProfile(@FirebaseUser() user: AuthenticatedUser): Promise<User | null> {
    return this.userService.findByFirebaseUid(user.uid);
  }


  @Get()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios obtenida exitosamente' })
  @HttpCode(HttpStatus.OK)
  async getAllUsers(): Promise<User[]> {
    return this.userService.findAll();
  }


  @Post('sync')
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({ summary: 'Sincronizar usuario con BD' })
  @HttpCode(HttpStatus.OK)
  async syncUser(@FirebaseUser() user: AuthenticatedUser): Promise<User> {
    return this.userService.syncUser({
      uid: user.uid,
      email: user.email,
      name: user.name,
    });
  }


  @Post('/:gymId/add-to-gym')
  @UseGuards(FirebaseAuthGuard)
  @Roles(Role.OWNER_GYM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Agregar usuario a gimnasio' })
  @HttpCode(HttpStatus.OK)
  async addUserToGym(@Body() body: { emails: string[] }, @Param('gymId') gymId: string): Promise<{ added: string[]; failed: string[] }> {
    return this.userService.addUsersToGym(body.emails, gymId);
  }

  
}