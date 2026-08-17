import { Reservation } from '../../entities/reservation.entity';
import { ReservationResponseDto } from './dto/reservation-response.dto';

export class ReservationMapper {
  static toResponse(entity: Reservation): ReservationResponseDto {
    const response: ReservationResponseDto = {
      id: entity.id,
      classId: entity.classId,
      studentId: entity.studentId,
      status: entity.status,
      createdAt: entity.createdAt,
    };

    if (entity.class) {
      response.class = {
        id: entity.class.id,
        gymId: entity.class.gymId,
        date: entity.class.date,
        startTime: entity.class.startTime,
        endTime: entity.class.endTime,
      };

      if (entity.class.discipline) {
        response.class.discipline = {
          id: entity.class.discipline.id,
          name: entity.class.discipline.name,
        };
      }

      if (entity.class.teacher) {
        response.class.teacher = {
          id: entity.class.teacher.id,
          name: entity.class.teacher.name,
        };
      }
    }

    return response;
  }
}
