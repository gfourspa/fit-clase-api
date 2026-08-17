import { Invitation } from '../../entities/invitation.entity';
import { InvitationResponseDto } from './dto/invitation-response.dto';

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
}
