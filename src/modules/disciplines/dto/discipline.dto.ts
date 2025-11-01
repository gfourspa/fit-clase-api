import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * DTO para crear una nueva disciplina
 */
export class CreateDisciplineDto {
  @ApiProperty({
    description: 'Nombre de la disciplina',
    example: 'Yoga',
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Descripción detallada de la disciplina',
    example: 'Clases de yoga para todos los niveles',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'UUID del gimnasio al que pertenece la disciplina',
    example: 'uuid-gym-123',
  })
  @IsNotEmpty()
  @IsUUID()
  gymId: string;
}

/**
 * DTO para actualizar una disciplina
 * Todos los campos son opcionales
 */
export class UpdateDisciplineDto extends PartialType(CreateDisciplineDto) {}

/**
 * DTO para filtros de búsqueda
 */
export class FilterDisciplineDto {
  @ApiProperty({
    description: 'Filtrar por gimnasio',
    example: 'uuid-gym-123',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  gymId?: string;

  @ApiProperty({
    description: 'Buscar por nombre (búsqueda parcial)',
    example: 'yoga',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;
}
