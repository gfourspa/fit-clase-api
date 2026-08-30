import { Invitation } from '../../entities/invitation.entity';
import {
  InvitationDeliveryResponseDto,
  InvitationResponseDto,
} from './dto/invitation-response.dto';

export class InvitationMapper {
  static toResponse(entity: Invitation): InvitationResponseDto {
    return {
      id: entity.id,
      gymId: entity.gymId,
      email: entity.email,
      status: entity.status,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toDeliveryResponse(
    entity: Invitation,
    invitationToken: string,
    acceptanceUrl: string,
    emailSent: boolean,
  ): InvitationDeliveryResponseDto {
    return {
      ...this.toResponse(entity),
      invitationToken,
      acceptanceUrl,
      emailSent,
    };
  }
}
