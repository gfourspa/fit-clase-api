import { Class } from '../../../entities/class.entity';
import { Discipline } from '../../../entities/discipline.entity';
import { User } from '../../../entities/user.entity';

export class DisciplineSummaryDto {
  id: string;
  name: string;

  static fromEntity(entity: Discipline): DisciplineSummaryDto {
    return {
      id: entity.id,
      name: entity.name,
    };
  }
}

export class TeacherSummaryDto {
  id: string;
  name: string | null;

  static fromEntity(entity: User): TeacherSummaryDto {
    return {
      id: entity.id,
      name: entity.name,
    };
  }
}

export class ClassResponseDto {
  id: string;
  gymId: string;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  discipline: DisciplineSummaryDto;
  teacher: TeacherSummaryDto;

  static fromEntity(entity: Class): ClassResponseDto {
    return {
      id: entity.id,
      gymId: entity.gymId,
      date: entity.date,
      startTime: entity.startTime,
      endTime: entity.endTime,
      capacity: entity.capacity,
      discipline: DisciplineSummaryDto.fromEntity(entity.discipline),
      teacher: TeacherSummaryDto.fromEntity(entity.teacher),
    };
  }
}
