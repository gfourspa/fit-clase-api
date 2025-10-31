import { Transform } from 'class-transformer';
import {
    IsDateString,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    Matches,
} from 'class-validator';

export class CreateClassDto {
  @IsString()
  gymId: string;

  @IsString()
  disciplineId: string;

  @IsString()
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
  @IsString()
  @IsOptional()
  disciplineId?: string;

  @IsString()
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
  @IsString()
  disciplineId?: string;

  @IsOptional()
  @IsString()
  gymId?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;
}