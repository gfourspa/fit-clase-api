import { Discipline } from '../../../entities/discipline.entity';

export class DisciplineResponseDto {
  id: string;
  name: string;
  description: string | null;
  gymId: string;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: Discipline): DisciplineResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      gymId: entity.gymId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
