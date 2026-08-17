import { ApiProperty } from '@nestjs/swagger';
import { Discipline } from '../../../entities/discipline.entity';

export class DisciplineResponseDto {
  @ApiProperty({
    description: 'Discipline UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ description: 'Discipline name', example: 'Yoga' })
  name: string;

  @ApiProperty({
    description: 'Optional description',
    example: 'Clases de yoga para todos los niveles',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Gym UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  gymId: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
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
