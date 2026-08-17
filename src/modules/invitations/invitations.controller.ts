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
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { FirebaseUser } from '../auth/firebase-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces';
import { CreateInvitationDto } from './dto/invitation.dto';
import { InvitationResponseDto } from './dto/invitation-response.dto';
import { InvitationMapper } from './invitation.mapper';
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
  @ApiCreatedResponse({ type: InvitationResponseDto })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async create(
    @Body() dto: CreateInvitationDto,
    @FirebaseUser() user: AuthenticatedUser,
  ): Promise<InvitationResponseDto> {
    const invitation = await this.invitationsService.create(dto, user);
    return InvitationMapper.toResponse(invitation);
  }
}
