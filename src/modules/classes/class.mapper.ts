import { Class } from '../../entities/class.entity';
import {
  ClassResponseDto,
  DisciplineSummaryDto,
  TeacherSummaryDto,
} from './dto/class-response.dto';

export class ClassMapper {
  static toResponse(entity: Class): ClassResponseDto {
    const response: ClassResponseDto = {
      id: entity.id,
      gymId: entity.gymId,
      date: entity.date,
      startTime: entity.startTime,
      endTime: entity.endTime,
      capacity: entity.capacity,
    };

    if (entity.discipline) {
      response.discipline = DisciplineSummaryDto.fromEntity(entity.discipline);
    }

    if (entity.teacher) {
      response.teacher = TeacherSummaryDto.fromEntity(entity.teacher);
    }

    return response;
  }
}
