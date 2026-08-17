import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Class } from '../../../entities/class.entity';
import { Reservation } from '../../../entities/reservation.entity';

export class DisciplineSummaryDto {
  @ApiProperty({
    description: 'Discipline UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ description: 'Discipline name', example: 'Yoga' })
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
  @ApiProperty({
    description: 'Teacher user UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Teacher display name',
    example: 'Alex Coach',
    nullable: true,
  })
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
  @ApiProperty({
    description: 'Class UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Gym UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  gymId: string;

  @ApiProperty({ description: 'Class date', example: '2026-08-20' })
  date: Date;

  @ApiProperty({ description: 'Start time (HH:mm:ss)', example: '09:00:00' })
  startTime: string;

  @ApiProperty({ description: 'End time (HH:mm:ss)', example: '10:00:00' })
  endTime: string;

  @ApiPropertyOptional({ type: () => DisciplineSummaryDto })
  discipline?: DisciplineSummaryDto;

  @ApiPropertyOptional({ type: () => TeacherSummaryDto })
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
  @ApiProperty({
    description: 'Reservation UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Class UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  classId: string;

  @ApiProperty({
    description: 'Student user UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  studentId: string;

  @ApiProperty({
    description: 'Reservation status',
    example: 'RESERVED',
  })
  status: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiPropertyOptional({ type: () => ClassSummaryDto })
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
