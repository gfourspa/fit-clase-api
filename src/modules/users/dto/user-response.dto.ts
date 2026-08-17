import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums';
import { User } from '../../../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({
    description: 'Internal user UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'Display name',
    example: 'Jane Doe',
    nullable: true,
  })
  name?: string | null;

  @ApiProperty({
    description: 'User email',
    example: 'jane@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Assigned role',
    example: 'STUDENT',
  })
  role!: string;

  @ApiPropertyOptional({
    description: 'Gym UUID the user belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  gymId?: string | null;

  static fromEntity(entity: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = entity.id;
    dto.name = entity.name ?? null;
    dto.email = entity.email!;
    dto.role = entity.role;
    dto.gymId = entity.gymId ?? null;
    return dto;
  }
}

export class UserAdminResponseDto {
  @ApiProperty({ description: 'Internal user UUID' })
  id!: string;

  @ApiPropertyOptional({ description: 'Display name', nullable: true })
  name?: string | null;

  @ApiProperty({ description: 'User email' })
  email!: string;

  @ApiProperty({ enum: Role, description: 'Assigned role' })
  role!: Role;

  @ApiPropertyOptional({ description: 'Gym UUID', nullable: true })
  gymId?: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}

export class AutoAssignStudentResponseDto {
  @ApiProperty({ description: 'Firebase user UID' })
  uid!: string;

  @ApiProperty({ description: 'User email' })
  email!: string;

  @ApiProperty({ enum: Role, description: 'Assigned role' })
  role!: Role;

  @ApiProperty({ description: 'Assigned gym UUID' })
  gymId!: string;
}

export class BulkAddUsersResponseDto {
  @ApiProperty({ type: [String], description: 'Emails added successfully' })
  added!: string[];

  @ApiProperty({
    type: [String],
    description: 'Emails that could not be added',
  })
  failed!: string[];
}
