import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateGymDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  contact: string;
}

export class UpdateGymDto {
  @IsString()
  @MinLength(2)
  name?: string;

  @IsString()
  address?: string;

  @IsString()
  contact?: string;
}