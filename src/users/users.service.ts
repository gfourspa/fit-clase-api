import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getFirebaseAdmin } from '../auth/firebase-admin.config';
import { Role } from '../common/enums';
import { User } from '../entities/user.entity';
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
  ) {}

  /**
   * Sincroniza un usuario de Firebase con la base de datos local
   * Se llama automáticamente cuando un usuario inicia sesión
   */
  async syncUser(firebaseUser: {
    uid: string;
    email?: string;
    name?: string;
  }): Promise<User> {
    let user = await this.findByFirebaseUid(firebaseUser.uid);

    if (!user) {
      // Crear nuevo usuario
      user = this.userRepository.create({
        firebase_uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.name,
        role: Role.STUDENT, // Rol por defecto
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
   * Asigna automáticamente el rol STUDENT a un nuevo usuario
   * Este método es llamado desde el frontend Flutter después del registro
   */
  async autoAssignStudent(uid: string, email: string, gymId: string): Promise<User> {
    this.logger.log(`Auto-asignando rol STUDENT a usuario: ${email} en gimnasio: ${gymId}`);

    try {
      // Verificar que el gymId exista (opcional - puedes agregar validación)
      if (!gymId) {
        throw new BadRequestException('gymId es requerido para asignar rol STUDENT');
      }

      // Actualizar custom claims en Firebase
      const admin = getFirebaseAdmin();
      await admin.auth().setCustomUserClaims(uid, {
        role: Role.STUDENT,
        gymId: gymId,
      });

      // Crear o actualizar usuario en la base de datos
      let user = await this.findByFirebaseUid(uid);
      
      if (!user) {
        // Crear nuevo usuario
        user = this.userRepository.create({
          firebase_uid: uid,
          email: email,
          role: Role.STUDENT,
          gymId: gymId,
        });
      } else {
        // Actualizar usuario existente
        user.email = email;
        user.role = Role.STUDENT;
        user.gymId = gymId;
      }

      user = await this.userRepository.save(user);
      
      this.logger.log(`Usuario ${email} asignado como STUDENT en gimnasio ${gymId}`);
      
      return user;
    } catch (error) {
      this.logger.error(`Error auto-asignando rol STUDENT: ${error.message}`);
      throw new BadRequestException(`Error asignando rol: ${error.message}`);
    }
  }

  /**
   * Busca un usuario por su Firebase UID
   */
  async findByFirebaseUid(firebase_uid: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { firebase_uid },
      relations: ['gym'],
    });
  }

  /**
   * Busca un usuario por su ID interno
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['gym'],
    });
  }

  /**
   * Obtiene todos los usuarios de un gimnasio específico
   */
  async findByGymId(gymId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { gymId },
      relations: ['gym'],
    });
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
      throw new BadRequestException('Rol inválido');
    }

    // Validar que si no es SUPER_ADMIN, debe tener gymId
    if (role !== Role.SUPER_ADMIN && !gymId) {
      throw new BadRequestException(
        'Los usuarios que no son SUPER_ADMIN deben tener un gymId asignado'
      );
    }

    // Buscar el usuario por Firebase UID
    const user = await this.findByFirebaseUid(uid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    try {
      // Actualizar custom claims en Firebase
      const admin = getFirebaseAdmin();
      await admin.auth().setCustomUserClaims(uid, {
        role,
        gymId: role === Role.SUPER_ADMIN ? null : gymId,
      });

      // Actualizar en la base de datos local
      user.role = role;
      user.gymId = role === Role.SUPER_ADMIN ? null : (gymId || null);
      
      const updatedUser = await this.userRepository.save(user);
      
      this.logger.log(`Rol ${role} asignado exitosamente a usuario ${uid}`);
      
      return updatedUser;
    } catch (error) {
      this.logger.error(`Error asignando rol: ${error.message}`);
      throw new BadRequestException('Error al asignar rol');
    }
  }

  /**
   * Crea un nuevo usuario
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Verificar que no exista un usuario con el mismo firebase_uid
    const existingUser = await this.findByFirebaseUid(createUserDto.firebase_uid);
    if (existingUser) {
      throw new BadRequestException('Usuario ya existe');
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
    return this.userRepository.find({
      relations: ['gym'],
    });
  }

  /**
   * Elimina un usuario (soft delete)
   */
  async remove(id: string): Promise<void> {
    const result = await this.userRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }
}