import { CustomException } from '@/common/exceptions/customs.exceptions';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvitationStatus, Role } from '../../common/enums';
import { Gym } from '../../entities/gym.entity';
import { Invitation } from '../../entities/invitation.entity';
import { User } from '../../entities/user.entity';
import { getFirebaseAdmin } from '../auth/firebase-admin.config';
import { AuthenticatedUser } from '../auth/interfaces';
import type { AssignRoleDto, CreateUserDto } from './dto/user.dto';

/**
 * UserService
 *
 * Maneja la sincronización de usuarios entre Firebase Auth y PostgreSQL.
 * Proporciona métodos para crear, actualizar y gestionar usuarios y roles.
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Gym)
    private readonly gymRepository: Repository<Gym>,
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,
  ) {}

  /**
   * Sincroniza un usuario de Firebase con la base de datos local
   * Se llama automáticamente cuando un usuario inicia sesión
   */
  async syncUser(firebaseUser: {
    uid: string;
    email?: string;
    name?: string;
    role?: string;
  }): Promise<User> {
    let user = await this.findByFirebaseUid(firebaseUser.uid);

    if (!user) {
      // Crear nuevo usuario
      user = this.userRepository.create({
        firebase_uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.name,
        role: (firebaseUser.role as Role) || Role.STUDENT,
      });

      user = await this.userRepository.save(user);
    } else {
      // Actualizar información del usuario existente
      if (firebaseUser.email && user.email !== firebaseUser.email) {
        user.email = firebaseUser.email;
      }
      if (firebaseUser.name && user.name !== firebaseUser.name) {
        user.name = firebaseUser.name;
      }

      user = await this.userRepository.save(user);
    }

    return user;
  }

  /**
   * Asigna automáticamente el rol STUDENT a un nuevo usuario usando una invitación.
   * La membresía al gimnasio se obtiene de la invitación, no del body del request.
   */
  async autoAssignStudent(
    uid: string,
    email: string,
    invitationToken: string,
  ): Promise<User> {
    this.logger.log(`🎓 Auto-asignando rol STUDENT a usuario: ${email}`);

    const normalizedEmail = email.toLowerCase().trim();

    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationToken },
    });

    if (!invitation) {
      throw CustomException.NotFound('Invitación no encontrada');
    }

    if (invitation.email.toLowerCase().trim() !== normalizedEmail) {
      throw CustomException.Unauthorized(
        'La invitación no corresponde a este email',
      );
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw CustomException.BadRequest(
        'La invitación ya fue utilizada o está cancelada',
      );
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw CustomException.BadRequest('La invitación ha expirado');
    }

    try {
      let user = await this.userRepository.findOne({
        where: { firebase_uid: uid },
      });

      if (!user) {
        user = this.userRepository.create({
          firebase_uid: uid,
          email: normalizedEmail,
          role: Role.STUDENT,
          gymId: invitation.gymId,
        });
      } else {
        user.email = normalizedEmail;
        user.role = Role.STUDENT;
        user.gymId = invitation.gymId;
      }

      user = await this.userRepository.save(user);

      invitation.status = InvitationStatus.USED;
      invitation.usedByUserId = user.id;
      await this.invitationRepository.save(invitation);

      try {
        const admin = getFirebaseAdmin();
        await admin.auth().setCustomUserClaims(uid, {
          id: user.id,
          role: Role.STUDENT,
          gymId: invitation.gymId,
        });
      } catch (claimsError) {
        this.logger.warn(
          `No se pudieron actualizar los claims de Firebase para ${email}: ${claimsError}`,
        );
      }

      this.logger.log(`Rol STUDENT asignado exitosamente a ${email}`);

      return user;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error asignando rol: ${msg}`, stack);
      throw CustomException.BadRequest(`Error asignando rol`);
    }
  }

  /**
   * Busca un usuario por su Firebase UID
   */
  async findByFirebaseUid(firebase_uid: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { firebase_uid },
      relations: ['gym'],
    });

    if (!user) {
      return null;
    }

    return user;
  }

  /**
   * Busca un usuario por su ID interno
   */
  async findById(id: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['gym'],
    });

    if (!user) {
      throw CustomException.NotFound('Usuario no encontrado');
    }

    return user;
  }

  /**
   * Obtiene todos los usuarios de un gimnasio específico
   */
  async findByGymId(gymId: string): Promise<User[]> {
    const users = await this.userRepository.find({
      where: { gymId },
      relations: ['gym'],
    });

    if (!users || users.length === 0) {
      throw CustomException.NotFound(
        'No se encontraron usuarios para el gimnasio especificado',
      );
    }

    return users;
  }

  /**
   * Obtiene usuarios por rol
   */
  async findByRole(role: Role, gymId?: string): Promise<User[]> {
    const where: any = { role };
    if (gymId) {
      where.gymId = gymId;
    }

    return this.userRepository.find({
      where,
      relations: ['gym'],
    });
  }

  /**
   * Asigna un rol y gimnasio a un usuario
   * También actualiza los custom claims en Firebase
   * Solo puede ser usado por SUPER_ADMIN
   */
  async assignRole(assignRoleDto: AssignRoleDto): Promise<User> {
    const { uid, role, gymId } = assignRoleDto;

    this.logger.log(`Asignando rol ${role} a usuario ${uid}`);

    // Validar que el rol sea válido
    if (!Object.values(Role).includes(role)) {
      throw CustomException.BadRequest('Rol inválido');
    }

    // Validar que si no es SUPER_ADMIN, debe tener gymId
    if (role !== Role.SUPER_ADMIN && !gymId) {
      throw CustomException.BadRequest(
        'Los usuarios que no son SUPER_ADMIN deben tener un gymId asignado',
      );
    }

    // Buscar el usuario por Firebase UID
    const user = await this.findByFirebaseUid(uid);
    if (!user) {
      throw CustomException.NotFound('Usuario no encontrado');
    }

    try {
      // Actualizar custom claims en Firebase incluyendo el id de BD
      const admin = getFirebaseAdmin();
      await admin.auth().setCustomUserClaims(uid, {
        id: user.id,
        role,
        gymId: role === Role.SUPER_ADMIN ? null : gymId,
      });

      // Actualizar en la base de datos local
      user.role = role;
      user.gymId = role === Role.SUPER_ADMIN ? null : gymId || null;

      const updatedUser = await this.userRepository.save(user);

      this.logger.log(`Rol ${role} asignado exitosamente a usuario ${uid}`);

      return updatedUser;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error asignando rol: ${msg}`);
      throw CustomException.BadRequest('Error al asignar rol');
    }
  }

  /**
   * Crea un nuevo usuario
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Verificar que no exista un usuario con el mismo firebase_uid
    const existingUser = await this.findByFirebaseUid(
      createUserDto.firebase_uid,
    );
    if (existingUser) {
      throw CustomException.Conflict('Usuario ya existe');
    }

    const user = this.userRepository.create({
      ...createUserDto,
      role: createUserDto.role || Role.STUDENT,
    });

    return await this.userRepository.save(user);
  }

  /**
   * Obtiene todos los usuarios (solo para SUPER_ADMIN)
   */

  async findAll(): Promise<User[]> {
    const users = await this.userRepository.find({
      relations: ['gym'],
    });

    if (!users || users.length === 0) {
      throw CustomException.NotFound('No se encontraron usuarios');
    }

    return users;
  }

  /**
   * Elimina un usuario (soft delete)
   */
  async remove(id: string): Promise<void> {
    const result = await this.userRepository.softDelete(id);
    if (result.affected === 0) {
      throw CustomException.NotFound('Usuario no encontrado');
    }
  }

  /**
   * Agrega múltiples usuarios a un gimnasio específico.
   * Solo OWNER_GYM del gimnasio o SUPER_ADMIN pueden ejecutar esta acción.
   */
  async addUsersToGym(
    emails: string[],
    gymId: string,
    user: AuthenticatedUser,
  ): Promise<{ added: string[]; failed: string[] }> {
    if (user.role !== Role.OWNER_GYM && user.role !== Role.SUPER_ADMIN) {
      throw CustomException.Unauthorized('Acceso denegado');
    }

    if (user.role === Role.OWNER_GYM) {
      const gym = await this.gymRepository.findOne({ where: { id: gymId } });
      if (!gym || gym.ownerId !== user.id) {
        throw CustomException.Unauthorized(
          'No tienes permisos para este gimnasio',
        );
      }
    }

    const added: string[] = [];
    const failed: string[] = [];

    for (const email of emails) {
      try {
        const normalizedEmail = email.toLowerCase().trim();
        const targetUser = await this.userRepository.findOne({
          where: { email: normalizedEmail },
        });

        if (!targetUser) {
          failed.push(email);
          this.logger.warn(`Usuario con email ${email} no encontrado`);
          continue;
        }

        targetUser.gymId = gymId;
        await this.userRepository.save(targetUser);

        // Sincronizar custom claims de Firebase si el usuario tiene firebase_uid
        if (targetUser.firebase_uid) {
          try {
            const admin = getFirebaseAdmin();
            await admin.auth().setCustomUserClaims(targetUser.firebase_uid, {
              id: targetUser.id,
              role: targetUser.role,
              gymId,
            });
          } catch (claimsError) {
            this.logger.warn(
              `No se pudieron actualizar los claims de Firebase para ${email}: ${claimsError}`,
            );
          }
        }

        added.push(email);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Error al agregar usuario ${email} a gimnasio ${gymId}: ${msg}`,
        );
        failed.push(email);
      }
    }

    return { added, failed };
  }
}
