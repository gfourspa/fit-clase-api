import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomException } from 'src/common/exceptions/customs.exceptions';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums';
import { Class } from '../../entities/class.entity';
import { Discipline } from '../../entities/discipline.entity';
import { Gym } from '../../entities/gym.entity';
import { User } from '../../entities/user.entity';
import { CreateClassDto, FilterClassDto, UpdateClassDto } from './dto/class.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Gym)
    private gymRepository: Repository<Gym>,
    @InjectRepository(Discipline)
    private disciplineRepository: Repository<Discipline>,
  ) {}

  async create(createClassDto: CreateClassDto, user: User): Promise<Class> {
    const { gymId, disciplineId, teacherId, date, startTime, endTime, capacity } = createClassDto;

    // Verificar que el gimnasio existe y el usuario tiene permisos
    const gym = await this.gymRepository.findOne({ where: { id: gymId } });
    if (!gym) {
      throw CustomException.NotFound('Gimnasio no encontrado');
    }

    if (user.role !== Role.SUPER_ADMIN && user.gymId !== gymId && gym.ownerId !== user.id) {
      throw CustomException.Unauthorized('No tienes permisos para crear clases en este gimnasio');
    }

    // Verificar disciplina
    const discipline = await this.disciplineRepository.findOne({ where: { id: disciplineId } });
    if (!discipline) {
      throw CustomException.NotFound('Disciplina no encontrada');
    }

    // Verificar profesor
    const teacher = await this.userRepository.findOne({ where: { id: teacherId, role: Role.TEACHER } });
    if (!teacher) {
      throw CustomException.NotFound('Profesor no encontrado');
    }

    // Verificar que el profesor pertenece al gimnasio
    if (teacher.gymId !== gymId) {
      throw CustomException.BadRequest('El profesor no pertenece a este gimnasio');
    }

    // Validar horarios
    if (startTime >= endTime) {
      throw CustomException.BadRequest('La hora de inicio debe ser menor a la hora de fin');
    }

    const classEntity = this.classRepository.create({
      gymId,
      disciplineId,
      teacherId,
      date: new Date(date),
      startTime,
      endTime,
      capacity,
    });

    return this.classRepository.save(classEntity);
  }

  async findAll(filterDto: FilterClassDto, user: User): Promise<{ classes: Class[]; total: number; page: number; limit: number }> {
    const { date, disciplineId, gymId, page = 1, limit = 10 } = filterDto;

    const queryBuilder = this.classRepository.createQueryBuilder('class')
      .leftJoinAndSelect('class.gym', 'gym')
      .leftJoinAndSelect('class.discipline', 'discipline')
      .leftJoinAndSelect('class.teacher', 'teacher')
      .leftJoinAndSelect('class.reservations', 'reservations');

    // Aplicar filtros según el rol del usuario
    if (user.role === Role.STUDENT || user.role === Role.TEACHER) {
      // Los estudiantes y profesores solo ven clases de su gimnasio
      queryBuilder.where('class.gymId = :userGymId', { userGymId: user.gymId });
    } else if (user.role === Role.OWNER_GYM) {
      // Los admins ven clases de los gimnasios que poseen
      queryBuilder.where('gym.ownerId = :userId', { userId: user.id });
    }

    // Aplicar filtros adicionales
    if (date) {
      queryBuilder.andWhere('DATE(class.date) = :date', { date });
    }

    if (disciplineId) {
      queryBuilder.andWhere('class.disciplineId = :disciplineId', { disciplineId });
    }

    if (gymId) {
      if (user.role !== Role.SUPER_ADMIN) {
        // Verificar que el usuario tiene acceso a este gimnasio
        const gym = await this.gymRepository.findOne({ where: { id: gymId } });
        if (!gym || (user.gymId !== gymId && gym.ownerId !== user.id)) {
          throw CustomException.Unauthorized('No tienes acceso a este gimnasio');
        }
      }
      queryBuilder.andWhere('class.gymId = :gymId', { gymId });
    }

    queryBuilder.orderBy('class.date', 'ASC').addOrderBy('class.startTime', 'ASC');

    const total = await queryBuilder.getCount();
    const classes = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { classes, total, page, limit };
  }

  async findOne(id: string, user: User): Promise<Class> {
    const classEntity = await this.classRepository.findOne({
      where: { id },
      relations: ['gym', 'discipline', 'teacher', 'reservations', 'reservations.student'],
    });

    if (!classEntity) {
      throw CustomException.NotFound('Clase no encontrada');
    }

    // Verificar permisos
    if (user.role !== Role.SUPER_ADMIN) {
      if (user.role === Role.OWNER_GYM && classEntity.gym.ownerId !== user.id) {
        throw CustomException.Unauthorized('No tienes acceso a esta clase');
      }
      if ((user.role === Role.TEACHER || user.role === Role.STUDENT) && classEntity.gymId !== user.gymId) {
        throw CustomException.Unauthorized('No tienes acceso a esta clase');
      }
    }

    return classEntity;
  }

  async update(id: string, updateClassDto: UpdateClassDto, user: User): Promise<Class> {
    const classEntity = await this.findOne(id, user);

    // Solo admins del gimnasio o super admin pueden editar
    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.OWNER_GYM) {
      throw CustomException.Unauthorized('Solo los administradores pueden editar clases');
    }

    if (user.role === Role.OWNER_GYM && classEntity.gym.ownerId !== user.id) {
      throw CustomException.Unauthorized('Solo puedes editar clases de tus gimnasios');
    }

    // Validaciones adicionales si se actualizan ciertos campos
    if (updateClassDto.teacherId) {
      const teacher = await this.userRepository.findOne({
        where: { id: updateClassDto.teacherId, role: Role.TEACHER },
      });
      if (!teacher || teacher.gymId !== classEntity.gymId) {
        throw CustomException.BadRequest('Profesor inválido para este gimnasio');
      }
    }

    if (updateClassDto.startTime && updateClassDto.endTime) {
      if (updateClassDto.startTime >= updateClassDto.endTime) {
        throw CustomException.BadRequest('La hora de inicio debe ser menor a la hora de fin');
      }
    }

    Object.assign(classEntity, updateClassDto);
    return this.classRepository.save(classEntity);
  }

  async remove(id: string, user: User): Promise<void> {
    const classEntity = await this.findOne(id, user);

    // Solo admins del gimnasio o super admin pueden eliminar
    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.OWNER_GYM) {
      throw CustomException.Unauthorized('Solo los administradores pueden eliminar clases');
    }

    if (user.role === Role.OWNER_GYM && classEntity.gym.ownerId !== user.id) {
      throw CustomException.Unauthorized('Solo puedes eliminar clases de tus gimnasios');
    }

    await this.classRepository.remove(classEntity);
  }

  async findByTeacher(teacherId: string, user: User): Promise<Class[]> {
    // Verificar que el usuario puede ver las clases de este profesor
    if (user.role === Role.TEACHER && user.id !== teacherId) {
      throw CustomException.Unauthorized('Solo puedes ver tus propias clases');
    }

    const teacher = await this.userRepository.findOne({
      where: { id: teacherId, role: Role.TEACHER },
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    // Verificar permisos adicionales
    if (user.role === Role.OWNER_GYM && teacher.gymId && user.gymId !== teacher.gymId) {
      const gym = await this.gymRepository.findOne({ where: { id: teacher.gymId } });
      if (!gym || gym.ownerId !== user.id) {
        throw CustomException.Unauthorized('No tienes acceso a las clases de este profesor');
      }
    }

    return this.classRepository.find({
      where: { teacherId },
      relations: ['gym', 'discipline', 'teacher', 'reservations'],
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

}