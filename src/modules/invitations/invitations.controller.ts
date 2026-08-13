import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Invitation } from '../../entities/invitation.entity';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { FirebaseUser } from '../auth/firebase-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces';
import { CreateInvitationDto } from './dto/invitation.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('Invitaciones')
@Controller('invitations')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @Roles(Role.OWNER_GYM, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear invitación para unirse a un gimnasio' })
  @ApiResponse({ status: 201, description: 'Invitación creada exitosamente' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async create(
    @Body() dto: CreateInvitationDto,
    @FirebaseUser() user: AuthenticatedUser,
  ): Promise<Invitation> {
    return this.invitationsService.create(dto, user);
  }
}
