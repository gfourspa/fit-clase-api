import { CustomException } from '@/common/exceptions/customs.exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums';
import { Gym } from '../../entities/gym.entity';
import { User } from '../../entities/user.entity';
import { CreateGymDto, UpdateGymDto } from './dto/gym.dto';

@Injectable()
export class GymsService {
  constructor(
    @InjectRepository(Gym)
    private gymRepository: Repository<Gym>,
  ) {}

  async create(createGymDto: CreateGymDto, ownerId: string): Promise<Gym> {
    const gym = this.gymRepository.create({
      ...createGymDto,
      ownerId,
    });

    return this.gymRepository.save(gym);
  }

  async findAll(user: User): Promise<Gym[]> {
    // Solo super admin puede ver todos los gimnasios
    if (user.role !== Role.SUPER_ADMIN) {
      throw CustomException.Unauthorized('Solo el super administrador puede ver todos los gimnasios');
    }

    return this.gymRepository.find({
      relations: ['owner', 'users', 'classes'],
    });
  }

  async findOne(id: string, user: User): Promise<Gym> {
    const gym = await this.gymRepository.findOne({
      where: { id },
      relations: ['owner', 'users', 'classes', 'classes.discipline', 'classes.teacher'],
    });

    if (!gym) {
      throw CustomException.NotFound('Gimnasio no encontrado');
    }

    // Verificar permisos
    if (user.role !== Role.SUPER_ADMIN && user.gymId !== gym.id && gym.ownerId !== user.id) {
      throw CustomException.Unauthorized('No tienes acceso a este gimnasio');
    }

    return gym;
  }

  async update(id: string, updateGymDto: UpdateGymDto, user: User): Promise<Gym> {
    const gym = await this.findOne(id, user);

    // Solo el dueño o super admin pueden editar
    if (user.role !== Role.SUPER_ADMIN && gym.ownerId !== user.id) {
      throw CustomException.Unauthorized('Solo el dueño del gimnasio puede editarlo');
    }

    if(!gym){
      throw CustomException.NotFound('Gimnasio no encontrado');
    }

    Object.assign(gym, updateGymDto);
    return this.gymRepository.save(gym);
  }

  async remove(id: string, user: User): Promise<void> {
    const gym = await this.findOne(id, user);

    // Solo el dueño o super admin pueden eliminar
    if (user.role !== Role.SUPER_ADMIN && gym.ownerId !== user.id) {
      throw CustomException.Unauthorized('Solo el dueño del gimnasio puede eliminarlo');
    }

    if(!gym){
      throw CustomException.NotFound('Gimnasio no encontrado');
    }

    await this.gymRepository.remove(gym);
  }
}