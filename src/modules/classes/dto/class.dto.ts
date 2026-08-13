import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateClassDto {
  @IsUUID()
  gymId: string;

  @IsUUID()
  disciplineId: string;

  @IsUUID()
  teacherId: string;

  @IsDateString()
  date: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime debe tener formato HH:MM',
  })
  startTime: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime debe tener formato HH:MM',
  })
  endTime: string;

  @IsNumber()
  @IsPositive()
  @Transform(({ value }) => parseInt(value))
  capacity: number;
}

export class UpdateClassDto {
  @IsUUID()
  @IsOptional()
  disciplineId?: string;

  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime debe tener formato HH:MM',
  })
  @IsOptional()
  startTime?: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime debe tener formato HH:MM',
  })
  @IsOptional()
  endTime?: string;

  @IsNumber()
  @IsPositive()
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  capacity?: number;
}

export class FilterClassDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  disciplineId?: string;

  @IsOptional()
  @IsUUID()
  gymId?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
