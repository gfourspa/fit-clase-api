import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { FirebaseUser } from '../auth/firebase-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces';
import {
  AcceptInvitationDto,
  CreateInvitationDto,
  ResendInvitationDto,
  ValidateInvitationQueryDto,
} from './dto/invitation.dto';
import {
  AcceptInvitationResponseDto,
  InvitationDeliveryResponseDto,
  InvitationResponseDto,
  ValidateInvitationResponseDto,
} from './dto/invitation-response.dto';
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
  @ApiCreatedResponse({ type: InvitationDeliveryResponseDto })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async create(
    @Body() dto: CreateInvitationDto,
    @FirebaseUser() user: AuthenticatedUser,
  ): Promise<InvitationDeliveryResponseDto> {
    const result = await this.invitationsService.create(dto, user);
    return InvitationMapper.toDeliveryResponse(
      result.invitation,
      result.invitationToken,
      result.acceptanceUrl,
      result.emailSent,
    );
  }

  @Get('accept')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validar un token de invitación',
    description:
      'Endpoint público para validar un token de invitación antes de aceptarlo. Devuelve información pública de la invitación.',
  })
  @ApiOkResponse({ type: ValidateInvitationResponseDto })
  @ApiResponse({ status: 400, description: 'Token no enviado' })
  @ApiResponse({
    status: 404,
    description: 'Invitación no encontrada o no válida',
  })
  async validate(
    @Query() query: ValidateInvitationQueryDto,
  ): Promise<ValidateInvitationResponseDto> {
    const invitation = await this.invitationsService.validateInvitationToken(
      query.token,
    );
    return {
      id: invitation.id,
      gymId: invitation.gymId,
      email: invitation.email,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    };
  }

  @Post('accept')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aceptar una invitacion como estudiante' })
  @ApiOkResponse({ type: AcceptInvitationResponseDto })
  async accept(
    @Body() dto: AcceptInvitationDto,
    @FirebaseUser() user: AuthenticatedUser,
  ): Promise<AcceptInvitationResponseDto> {
    const invitationToken = dto.token ?? dto.invitationToken;
    if (!invitationToken) {
      throw new BadRequestException('Token de invitacion requerido');
    }
    const result = await this.invitationsService.accept(user, invitationToken);
    return {
      uid: result.user.firebase_uid ?? user.uid,
      email: result.user.email ?? '',
      role: result.user.role,
      gymId: result.user.gymId ?? '',
      idempotent: result.idempotent,
      claimsUpdated: result.claimsUpdated,
    };
  }

  @Post(':id/cancel')
  @Roles(Role.OWNER_GYM, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar una invitacion pendiente' })
  @ApiOkResponse({ type: InvitationResponseDto })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @FirebaseUser() user: AuthenticatedUser,
  ): Promise<InvitationResponseDto> {
    const invitation = await this.invitationsService.cancel(id, user);
    return InvitationMapper.toResponse(invitation);
  }

  @Post(':id/resend')
  @Roles(Role.OWNER_GYM, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reenviar una invitacion con un token nuevo' })
  @ApiCreatedResponse({ type: InvitationDeliveryResponseDto })
  async resend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResendInvitationDto,
    @FirebaseUser() user: AuthenticatedUser,
  ): Promise<InvitationDeliveryResponseDto> {
    const result = await this.invitationsService.resend(id, dto, user);
    return InvitationMapper.toDeliveryResponse(
      result.invitation,
      result.invitationToken,
      result.acceptanceUrl,
      result.emailSent,
    );
  }
}
