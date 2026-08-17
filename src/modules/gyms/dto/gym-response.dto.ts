import { ApiProperty } from '@nestjs/swagger';
import { Gym } from '../../../entities/gym.entity';

export class GymResponseDto {
  @ApiProperty({
    description: 'Gym UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ description: 'Gym name', example: 'FitClase Centro' })
  name: string;

  @ApiProperty({
    description: 'Gym address',
    example: 'Av. Principal 123',
  })
  address: string;

  @ApiProperty({
    description: 'Contact phone or email',
    example: '+54 11 5555-1234',
  })
  contact: string;

  @ApiProperty({
    description: 'Owner user UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  ownerId: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  static fromEntity(entity: Gym): GymResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      address: entity.address,
      contact: entity.contact,
      ownerId: entity.ownerId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
