import { CustomException } from '@/common/exceptions/customs.exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvitationStatus, Role } from '../../common/enums';
import { Gym } from '../../entities/gym.entity';
import { Invitation } from '../../entities/invitation.entity';
import { AuthenticatedUser } from '../auth/interfaces';
import { CreateInvitationDto } from './dto/invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(Gym)
    private gymRepository: Repository<Gym>,
  ) {}

  async create(
    dto: CreateInvitationDto,
    user: AuthenticatedUser,
  ): Promise<Invitation> {
    if (user.role !== Role.OWNER_GYM && user.role !== Role.SUPER_ADMIN) {
      throw CustomException.Unauthorized(
        'No tienes permisos para crear invitaciones',
      );
    }

    const gym = await this.gymRepository.findOne({ where: { id: dto.gymId } });
    if (!gym) {
      throw CustomException.NotFound('Gimnasio no encontrado');
    }

    if (user.role === Role.OWNER_GYM && gym.ownerId !== user.id) {
      throw CustomException.Unauthorized(
        'No tienes permisos para invitar a este gimnasio',
      );
    }

    const expiresAt = dto.expiresInHours
      ? new Date(Date.now() + dto.expiresInHours * 60 * 60 * 1000)
      : null;

    const invitation = this.invitationRepository.create({
      gymId: dto.gymId,
      email: dto.email.toLowerCase().trim(),
      status: InvitationStatus.PENDING,
      expiresAt,
    });

    return this.invitationRepository.save(invitation);
  }

  async findPendingById(id: string): Promise<Invitation | null> {
    return this.invitationRepository.findOne({
      where: { id, status: InvitationStatus.PENDING },
    });
  }

  async markAsUsed(
    invitation: Invitation,
    userId: string,
  ): Promise<Invitation> {
    invitation.status = InvitationStatus.USED;
    invitation.usedByUserId = userId;
    return this.invitationRepository.save(invitation);
  }
}
