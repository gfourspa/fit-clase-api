import { User } from '../../entities/user.entity';
import {
  AutoAssignStudentResponseDto,
  BulkAddUsersResponseDto,
  UserAdminResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';

export class UserMapper {
  static toResponse(entity: User): UserResponseDto {
    return {
      id: entity.id,
      name: entity.name ?? null,
      email: entity.email ?? '',
      role: entity.role,
      gymId: entity.gymId ?? null,
    };
  }

  static toAdminResponse(entity: User): UserAdminResponseDto {
    return {
      id: entity.id,
      name: entity.name ?? null,
      email: entity.email ?? '',
      role: entity.role,
      gymId: entity.gymId ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toAutoAssignStudentResponse(
    entity: User,
  ): AutoAssignStudentResponseDto {
    return {
      uid: entity.firebase_uid ?? '',
      email: entity.email ?? '',
      role: entity.role,
      gymId: entity.gymId ?? '',
    };
  }

  static toBulkAddUsersResponse(result: {
    added: string[];
    failed: string[];
  }): BulkAddUsersResponseDto {
    return {
      added: result.added,
      failed: result.failed,
    };
  }
}
