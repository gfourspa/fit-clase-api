import { ApiProperty } from '@nestjs/swagger';
import { Class } from '../../../entities/class.entity';
import { Discipline } from '../../../entities/discipline.entity';
import { User } from '../../../entities/user.entity';

export class DisciplineSummaryDto {
  @ApiProperty({
    description: 'Discipline UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ description: 'Discipline name', example: 'Yoga' })
  name: string;

  static fromEntity(entity: Discipline): DisciplineSummaryDto {
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

  static fromEntity(entity: User): TeacherSummaryDto {
    return {
      id: entity.id,
      name: entity.name,
    };
  }
}

export class ClassResponseDto {
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

  @ApiProperty({ description: 'Maximum capacity', example: 20 })
  capacity: number;

  @ApiProperty({ type: () => DisciplineSummaryDto })
  discipline?: DisciplineSummaryDto;

  @ApiProperty({ type: () => TeacherSummaryDto })
  teacher?: TeacherSummaryDto;

  static fromEntity(entity: Class): ClassResponseDto {
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

/** List envelope returned by GET /classes (preserves current contract key `classes`). */
export class ClassListResponseDto {
  @ApiProperty({ type: [ClassResponseDto] })
  classes: ClassResponseDto[];

  @ApiProperty({ description: 'Total matching classes', example: 42 })
  total: number;

  @ApiProperty({ description: 'Current page (1-based)', example: 1 })
  page: number;

  @ApiProperty({ description: 'Page size', example: 10 })
  limit: number;
}
