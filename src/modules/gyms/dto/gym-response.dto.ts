import { Gym } from '../../../entities/gym.entity';

export class GymResponseDto {
  id: string;
  name: string;
  address: string;
  contact: string;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: Gym): GymResponseDto {
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
