import { Discipline } from '../../entities/discipline.entity';
import { DisciplineResponseDto } from './dto/discipline-response.dto';

export class DisciplineMapper {
  static toResponse(entity: Discipline): DisciplineResponseDto {
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
