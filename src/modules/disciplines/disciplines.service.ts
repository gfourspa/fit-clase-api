import { Role } from '@/common/enums';
import { CustomException } from '@/common/exceptions/customs.exceptions';
import {
  Injectable,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Discipline } from '../../entities/discipline.entity';
import { Gym } from '../../entities/gym.entity';
import { AuthenticatedUser } from '../auth';
import { CreateDisciplineDto, FilterDisciplineDto, UpdateDisciplineDto } from './dto/discipline.dto';

/**
 * DisciplinesService
 * 
 * Maneja el CRUD completo de disciplinas deportivas.
 * Las disciplinas están asociadas a un gimnasio específico.
 */
@Injectable()
export class DisciplinesService {
  private readonly logger = new Logger(DisciplinesService.name);

  constructor(
    @InjectRepository(Discipline)
    private disciplineRepository: Repository<Discipline>,
    @InjectRepository(Gym)
    private gymRepository: Repository<Gym>,
  ) {}

  /**
   * Crear una nueva disciplina
   * Solo OWNER_GYM y SUPER_ADMIN pueden crear disciplinas
   */
  async create(createDisciplineDto: CreateDisciplineDto, user: AuthenticatedUser): Promise<Discipline> {
    this.logger.log(`Creando nueva disciplina: ${createDisciplineDto.name}`);

    if (user.role === Role.OWNER_GYM && user.gymId !== createDisciplineDto.gymId) {
      throw CustomException.Unauthorized('Solo puedes crear disciplinas en tu propio gimnasio');
    }

    // Verificar que el gimnasio existe
    const gym = await this.gymRepository.findOne({
      where: { id: createDisciplineDto.gymId },
    });

    if (!gym) {
      throw CustomException.NotFound(`Gimnasio con ID ${createDisciplineDto.gymId} no encontrado`);
    }

    // Verificar si ya existe una disciplina con el mismo nombre en el mismo gimnasio
    const existingDiscipline = await this.disciplineRepository.findOne({
      where: {
        name: createDisciplineDto.name,
        gymId: createDisciplineDto.gymId,
      },
    });

    if (existingDiscipline) {
      throw CustomException.Conflict(
        `Ya existe una disciplina con el nombre "${createDisciplineDto.name}" en este gimnasio`
      );
    }

    const discipline = this.disciplineRepository.create(createDisciplineDto);
    const savedDiscipline = await this.disciplineRepository.save(discipline);

    this.logger.log(`Disciplina creada: ${savedDiscipline.id}`);
    return savedDiscipline;
  }

  /**
   * Obtener todas las disciplinas con filtros opcionales
   * Filtros disponibles: gymId, name (búsqueda parcial)
   */
  async findAll(filters: FilterDisciplineDto, user: AuthenticatedUser): Promise<Discipline[]> {
    this.logger.log(`Obteniendo disciplinas con filtros: ${JSON.stringify(filters)}`);

    // Si es OWNER_GYM, solo mostrar disciplinas de su gimnasio
    if (user.role === Role.OWNER_GYM && !filters.gymId) {
      filters.gymId = user.gymId;
    }

    // Si es TEACHER o STUDENT, solo mostrar disciplinas de su gimnasio
    if ((user.role === Role.TEACHER || user.role === Role.STUDENT) && !filters.gymId) {
      filters.gymId = user.gymId;
    }


    const where: any = {};

    // Filtro por gymId
    if (filters?.gymId) {
      where.gymId = filters.gymId;
    }

    // Filtro por nombre (búsqueda parcial case-insensitive)
    if (filters?.name) {
      where.name = ILike(`%${filters.name}%`);
    }

    const disciplines = await this.disciplineRepository.find({
      where,
      relations: ['gym'],
      order: { name: 'ASC' },
    });

    if (!disciplines || disciplines.length === 0) {
      throw CustomException.NotFound('No se encontraron disciplinas con los filtros especificados');
    }

    return disciplines;
  }

  /**
   * Obtener una disciplina por ID
   */
  async findOne(id: string): Promise<Discipline> {
    this.logger.log(`Buscando disciplina con ID: ${id}`);

    const discipline = await this.disciplineRepository.findOne({
      where: { id },
      relations: ['gym', 'classes'],
    });

    if (!discipline) {
      throw CustomException.NotFound(`Disciplina con ID ${id} no encontrada`);
    }

    return discipline;
  }

  /**
   * Obtener disciplinas por gimnasio
   */
  async findByGymId(gymId: string): Promise<Discipline[]> {
    this.logger.log(`Obteniendo disciplinas del gimnasio: ${gymId}`);

    const disciplines = await this.disciplineRepository.find({
      where: { gymId },
      relations: ['gym'],
      order: { name: 'ASC' },
    });

    if (!disciplines || disciplines.length === 0) {
      throw CustomException.NotFound(`No se encontraron disciplinas para el gimnasio con ID ${gymId}`);
    }

    return disciplines;

  }

  /**
   * Actualizar una disciplina
   * Solo OWNER_GYM (del gimnasio) y SUPER_ADMIN pueden actualizar
   */
  async update(id: string, updateDisciplineDto: UpdateDisciplineDto, user: AuthenticatedUser): Promise<Discipline> {
    this.logger.log(`Actualizando disciplina: ${id}`);

    const discipline = await this.findOne(id);

    // Validar que OWNER_GYM solo pueda actualizar disciplinas de su gimnasio
    if (user.role === Role.OWNER_GYM && user.gymId !== discipline.gymId) {
      throw CustomException.Unauthorized('Solo puedes actualizar disciplinas de tu propio gimnasio');
    }

    // Si se está actualizando el gymId, verificar que el nuevo gimnasio existe
    if (updateDisciplineDto.gymId && updateDisciplineDto.gymId !== discipline.gymId) {
      const gym = await this.gymRepository.findOne({
        where: { id: updateDisciplineDto.gymId },
      });

      if (!gym) {
        throw CustomException.NotFound(`Gimnasio con ID ${updateDisciplineDto.gymId} no encontrado`);
      }
    }

    // Si se está actualizando el nombre, verificar que no exista otra con el mismo nombre
    if (updateDisciplineDto.name && updateDisciplineDto.name !== discipline.name) {
      const existingDiscipline = await this.disciplineRepository.findOne({
        where: {
          name: updateDisciplineDto.name,
          gymId: updateDisciplineDto.gymId || discipline.gymId,
        },
      });

      if (existingDiscipline && existingDiscipline.id !== id) {
        throw CustomException.Conflict(
          `Ya existe una disciplina con el nombre "${updateDisciplineDto.name}" en este gimnasio`
        );
      }
    }

    Object.assign(discipline, updateDisciplineDto);
    const updatedDiscipline = await this.disciplineRepository.save(discipline);

    this.logger.log(`Disciplina actualizada: ${id}`);
    return updatedDiscipline;
  }

  /**
   * Eliminar una disciplina (soft delete)
   * Solo OWNER_GYM (del gimnasio) y SUPER_ADMIN pueden eliminar
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    this.logger.log(`Eliminando disciplina: ${id}`);

    const discipline = await this.findOne(id);


    // Validar que OWNER_GYM solo pueda eliminar disciplinas de su gimnasio
    if (user.role === Role.OWNER_GYM && user.gymId !== discipline.gymId) {
      throw CustomException.Unauthorized('Solo puedes eliminar disciplinas de tu propio gimnasio');
    }

    // Verificar si hay clases asociadas
    if (discipline.classes && discipline.classes.length > 0) {
      throw CustomException.Conflict(
        `No se puede eliminar la disciplina porque tiene ${discipline.classes.length} clase(s) asociada(s)`
      );
    }

    await this.disciplineRepository.softDelete(id);
    this.logger.log(`Disciplina eliminada: ${id}`);
  }
}