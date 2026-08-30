import { CustomException } from '@/common/exceptions/customs.exceptions';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { InvitationStatus, Role } from '../../common/enums';
import { Gym } from '../../entities/gym.entity';
import { Invitation } from '../../entities/invitation.entity';
import { User } from '../../entities/user.entity';
import { getFirebaseAdmin } from '../auth/firebase-admin.config';
import { AuthenticatedUser } from '../auth/interfaces';
import { CreateInvitationDto, ResendInvitationDto } from './dto/invitation.dto';
import { InvitationEmailService } from './invitation-email.service';

const DEFAULT_EXPIRATION_HOURS = 72;

export interface InvitationDeliveryResult {
  invitation: Invitation;
  invitationToken: string;
  acceptanceUrl: string;
  emailSent: boolean;
}

export interface AcceptInvitationResult {
  user: User;
  idempotent: boolean;
  claimsUpdated: boolean;
}

export interface ValidatedInvitationInfo {
  id: string;
  gymId: string;
  email: string;
  status: InvitationStatus;
  expiresAt: Date;
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,
    @InjectRepository(Gym)
    private readonly gymRepository: Repository<Gym>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly invitationEmailService: InvitationEmailService,
  ) {}

  async create(
    dto: CreateInvitationDto,
    currentUser: AuthenticatedUser,
  ): Promise<InvitationDeliveryResult> {
    const creatorId = this.requireCreator(currentUser);
    const email = this.normalizeEmail(dto.email);
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = this.calculateExpiration(dto.expiresInHours);

    let invitation: Invitation;
    let gym: Gym;

    try {
      ({ invitation, gym } =
        await this.invitationRepository.manager.transaction(async (manager) => {
          const invitationRepository = manager.getRepository(Invitation);
          const gymRepository = manager.getRepository(Gym);
          const targetGym = await gymRepository.findOne({
            where: { id: dto.gymId },
          });

          if (!targetGym) {
            throw CustomException.NotFound('Gimnasio no encontrado');
          }
          this.assertCanManageGym(currentUser, targetGym);

          await invitationRepository
            .createQueryBuilder()
            .update(Invitation)
            .set({ status: InvitationStatus.EXPIRED })
            .where('"gymId" = :gymId', { gymId: dto.gymId })
            .andWhere('LOWER(BTRIM("email")) = :email', { email })
            .andWhere('"status" = :status', {
              status: InvitationStatus.PENDING,
            })
            .andWhere('"expiresAt" <= :now', { now: new Date() })
            .execute();

          const pendingInvitation = await invitationRepository.findOne({
            where: {
              gymId: dto.gymId,
              email,
              status: InvitationStatus.PENDING,
            },
          });
          if (pendingInvitation) {
            throw CustomException.Conflict(
              'Ya existe una invitacion pendiente para este email y gimnasio',
            );
          }

          const createdInvitation = invitationRepository.create({
            gymId: dto.gymId,
            email,
            tokenHash,
            createdByUserId: creatorId,
            status: InvitationStatus.PENDING,
            expiresAt,
          });

          return {
            invitation: await invitationRepository.save(createdInvitation),
            gym: targetGym,
          };
        }));
    } catch (error) {
      this.handleUniqueViolation(error);
      throw error;
    }

    return this.deliver(invitation, gym, token);
  }

  async accept(
    currentUser: AuthenticatedUser,
    invitationToken: string,
  ): Promise<AcceptInvitationResult> {
    const firebaseEmail = currentUser.firebaseEmail;
    if (!firebaseEmail || currentUser.emailVerified !== true) {
      throw CustomException.Unauthorized(
        'Debes verificar tu email de Firebase antes de aceptar la invitacion',
      );
    }

    const normalizedEmail = this.normalizeEmail(firebaseEmail);
    const tokenHash = this.hashToken(invitationToken);
    let transactionResult: { user: User; idempotent: boolean };
    try {
      transactionResult = await this.invitationRepository.manager.transaction(
        async (manager) => {
          const invitationRepository = manager.getRepository(Invitation);
          const userRepository = manager.getRepository(User);

          const invitation = await this.validateAndFetchInvitation(
            tokenHash,
            manager,
          );

          if (this.normalizeEmail(invitation.email) !== normalizedEmail) {
            throw CustomException.Unauthorized(
              'La invitacion no corresponde al email autenticado',
            );
          }

          let user = await userRepository.findOne({
            where: { firebase_uid: currentUser.uid },
          });

          if (invitation.status === InvitationStatus.USED) {
            if (
              user &&
              invitation.usedByUserId === user.id &&
              user.role === Role.STUDENT &&
              user.gymId === invitation.gymId
            ) {
              return { user, idempotent: true };
            }
            throw CustomException.BadRequest('La invitacion ya fue utilizada');
          }

          if (user) {
            if (user.role !== Role.STUDENT) {
              throw CustomException.Conflict(
                'Un usuario con rol administrativo o profesor no puede aceptar una invitacion de estudiante',
              );
            }
            if (user.gymId && user.gymId !== invitation.gymId) {
              throw CustomException.Conflict(
                'El estudiante ya pertenece a otro gimnasio',
              );
            }
            user.email = normalizedEmail;
            user.gymId = invitation.gymId;
          } else {
            const emailOwner = await userRepository.findOne({
              where: { email: normalizedEmail },
            });
            if (emailOwner) {
              throw CustomException.Conflict(
                'El email ya pertenece a otro usuario',
              );
            }
            user = userRepository.create({
              firebase_uid: currentUser.uid,
              email: normalizedEmail,
              role: Role.STUDENT,
              gymId: invitation.gymId,
            });
          }

          user = await userRepository.save(user);
          invitation.status = InvitationStatus.USED;
          invitation.usedByUserId = user.id;
          invitation.usedAt = new Date();
          await invitationRepository.save(invitation);

          return { user, idempotent: false };
        },
      );
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const pgError = error as QueryFailedError & { code?: string };
        if (pgError.code === '23505') {
          throw CustomException.Conflict(
            'El email ya pertenece a otro usuario',
          );
        }
      }
      throw error;
    }

    const claimsUpdated = await this.updateFirebaseClaims(
      transactionResult.user,
    );
    return {
      user: transactionResult.user,
      idempotent: transactionResult.idempotent,
      claimsUpdated,
    };
  }

  /**
   * Valida un token de invitación de forma segura sin exponer información sensible.
   * Devuelve información pública de la invitación si es válida.
   * Lanza errores genéricos para evitar enumeración de tokens.
   */
  async validateInvitationToken(
    invitationToken: string,
  ): Promise<ValidatedInvitationInfo> {
    const tokenHash = this.hashToken(invitationToken);
    const invitation = await this.validateAndFetchInvitation(tokenHash);

    if (invitation.status === InvitationStatus.USED) {
      throw CustomException.BadRequest('La invitacion ya fue utilizada');
    }

    return {
      id: invitation.id,
      gymId: invitation.gymId,
      email: invitation.email,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    };
  }

  async cancel(
    invitationId: string,
    currentUser: AuthenticatedUser,
  ): Promise<Invitation> {
    this.requireCreator(currentUser);
    return this.invitationRepository.manager.transaction(async (manager) => {
      const invitationRepository = manager.getRepository(Invitation);
      const gymRepository = manager.getRepository(Gym);
      const invitation = await invitationRepository.findOne({
        where: { id: invitationId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!invitation) {
        throw CustomException.NotFound('Invitacion no encontrada');
      }
      const gym = await gymRepository.findOne({
        where: { id: invitation.gymId },
      });
      if (!gym) {
        throw CustomException.NotFound('Gimnasio no encontrado');
      }
      this.assertCanManageGym(currentUser, gym);

      if (invitation.status === InvitationStatus.CANCELED) {
        return invitation;
      }
      if (invitation.status !== InvitationStatus.PENDING) {
        throw CustomException.BadRequest(
          'Solo se pueden cancelar invitaciones pendientes',
        );
      }

      invitation.status = InvitationStatus.CANCELED;
      invitation.canceledAt = new Date();
      return invitationRepository.save(invitation);
    });
  }

  async resend(
    invitationId: string,
    dto: ResendInvitationDto,
    currentUser: AuthenticatedUser,
  ): Promise<InvitationDeliveryResult> {
    const creatorId = this.requireCreator(currentUser);
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);

    const { invitation, gym } =
      await this.invitationRepository.manager.transaction(async (manager) => {
        const invitationRepository = manager.getRepository(Invitation);
        const gymRepository = manager.getRepository(Gym);
        const existing = await invitationRepository.findOne({
          where: { id: invitationId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!existing) {
          throw CustomException.NotFound('Invitacion no encontrada');
        }
        const targetGym = await gymRepository.findOne({
          where: { id: existing.gymId },
        });
        if (!targetGym) {
          throw CustomException.NotFound('Gimnasio no encontrado');
        }
        this.assertCanManageGym(currentUser, targetGym);
        if (existing.status === InvitationStatus.USED) {
          throw CustomException.BadRequest(
            'Una invitacion utilizada no se puede reenviar',
          );
        }

        if (existing.status === InvitationStatus.PENDING) {
          existing.status = InvitationStatus.CANCELED;
          existing.canceledAt = new Date();
          await invitationRepository.save(existing);
        }

        const replacement = invitationRepository.create({
          gymId: existing.gymId,
          email: existing.email,
          tokenHash,
          createdByUserId: creatorId,
          status: InvitationStatus.PENDING,
          expiresAt: this.calculateExpiration(dto.expiresInHours),
        });
        return {
          invitation: await invitationRepository.save(replacement),
          gym: targetGym,
        };
      });

    return this.deliver(invitation, gym, token);
  }

  private async deliver(
    invitation: Invitation,
    gym: Gym,
    token: string,
  ): Promise<InvitationDeliveryResult> {
    const delivery = await this.invitationEmailService.sendInvitation({
      email: invitation.email,
      gymName: gym.name,
      token,
      expiresAt: invitation.expiresAt,
    });
    return {
      invitation,
      invitationToken: token,
      ...delivery,
    };
  }

  private requireCreator(user: AuthenticatedUser): string {
    if (
      !user.id ||
      (user.role !== Role.OWNER_GYM && user.role !== Role.SUPER_ADMIN)
    ) {
      throw CustomException.BadRequestForbidden(
        'No tienes permisos para gestionar invitaciones',
      );
    }
    return user.id;
  }

  private assertCanManageGym(user: AuthenticatedUser, gym: Gym): void {
    if (user.role === Role.OWNER_GYM && gym.ownerId !== user.id) {
      throw CustomException.BadRequestForbidden(
        'No tienes permisos para gestionar invitaciones de este gimnasio',
      );
    }
  }

  /**
   * Busca y valida una invitación por su hash de token.
   * Lanza errores genéricos para evitar enumeración de tokens.
   * Si se proporciona un manager, se ejecuta dentro de esa transacción.
   */
  private async validateAndFetchInvitation(
    tokenHash: string,
    manager?: EntityManager,
  ): Promise<Invitation> {
    const invitationRepository = manager
      ? manager.getRepository(Invitation)
      : this.invitationRepository;

    const query = invitationRepository
      .createQueryBuilder('invitation')
      .addSelect('invitation.tokenHash')
      .where('invitation.tokenHash = :tokenHash', { tokenHash });

    if (manager) {
      query.setLock('pessimistic_write');
    }

    const invitation = await query.getOne();

    if (!invitation) {
      throw CustomException.NotFound('Invitacion no encontrada');
    }

    if (invitation.status === InvitationStatus.CANCELED) {
      throw CustomException.BadRequest('La invitacion fue cancelada');
    }
    if (
      invitation.status === InvitationStatus.EXPIRED ||
      invitation.expiresAt <= new Date()
    ) {
      if (invitation.status === InvitationStatus.PENDING) {
        invitation.status = InvitationStatus.EXPIRED;
        await invitationRepository.save(invitation);
      }
      throw CustomException.BadRequest('La invitacion ha expirado');
    }

    return invitation;
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private calculateExpiration(expiresInHours?: number): Date {
    const hours = expiresInHours ?? DEFAULT_EXPIRATION_HOURS;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    const canonicalToken = /^[0-9a-f-]{36}$/i.test(token)
      ? token.toLowerCase()
      : token;
    return createHash('sha256').update(canonicalToken).digest('hex');
  }

  private async updateFirebaseClaims(user: User): Promise<boolean> {
    if (!user.firebase_uid) {
      this.logger.warn(`Usuario ${user.id} sin Firebase UID; claims omitidos`);
      return false;
    }
    try {
      const admin = getFirebaseAdmin();
      await admin.auth().setCustomUserClaims(user.firebase_uid, {
        id: user.id,
        role: Role.STUDENT,
        gymId: user.gymId,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `No se pudieron actualizar los claims de Firebase para ${user.email}: ${message}`,
      );
      return false;
    }
  }

  private handleUniqueViolation(error: unknown): void {
    if (error instanceof QueryFailedError) {
      const pgError = error as QueryFailedError & { code?: string };
      if (pgError.code === '23505') {
        throw CustomException.Conflict(
          'Ya existe una invitacion pendiente para este email y gimnasio',
        );
      }
    }
  }
}
