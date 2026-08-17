import { Gym } from '../../entities/gym.entity';
import { GymResponseDto } from './dto/gym-response.dto';

export class GymMapper {
  static toResponse(entity: Gym): GymResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      address: entity.address,
      contact: entity.contact,
      ownerId: entity.ownerId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
