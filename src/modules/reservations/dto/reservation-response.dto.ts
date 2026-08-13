import { Class } from '../../../entities/class.entity';
import { Reservation } from '../../../entities/reservation.entity';

export class DisciplineSummaryDto {
  id: string;
  name: string;

  static fromEntity(entity: {
    id: string;
    name: string;
  }): DisciplineSummaryDto {
    return {
      id: entity.id,
      name: entity.name,
    };
  }
}

export class TeacherSummaryDto {
  id: string;
  name: string | null;

  static fromEntity(entity: {
    id: string;
    name: string | null;
  }): TeacherSummaryDto {
    return {
      id: entity.id,
      name: entity.name,
    };
  }
}

export class ClassSummaryDto {
  id: string;
  gymId: string;
  date: Date;
  startTime: string;
  endTime: string;
  discipline?: DisciplineSummaryDto;
  teacher?: TeacherSummaryDto;

  static fromEntity(entity: Class): ClassSummaryDto {
    const summary: ClassSummaryDto = {
      id: entity.id,
      gymId: entity.gymId,
      date: entity.date,
      startTime: entity.startTime,
      endTime: entity.endTime,
    };

    if (entity.discipline) {
      summary.discipline = DisciplineSummaryDto.fromEntity(entity.discipline);
    }

    if (entity.teacher) {
      summary.teacher = TeacherSummaryDto.fromEntity(entity.teacher);
    }

    return summary;
  }
}

export class ReservationResponseDto {
  id: string;
  classId: string;
  studentId: string;
  status: string;
  createdAt: Date;
  class?: ClassSummaryDto;

  static fromEntity(entity: Reservation): ReservationResponseDto {
    const dto: ReservationResponseDto = {
      id: entity.id,
      classId: entity.classId,
      studentId: entity.studentId,
      status: entity.status,
      createdAt: entity.createdAt,
    };

    if (entity.class) {
      dto.class = ClassSummaryDto.fromEntity(entity.class);
    }

    return dto;
  }
}
