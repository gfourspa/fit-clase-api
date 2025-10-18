import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReservationStatus, Role } from '../common/enums';
import { Class } from '../entities/class.entity';
import { Reservation } from '../entities/reservation.entity';
import { User } from '../entities/user.entity';
import { CreateReservationDto } from './dto/reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
  ) {}

  async create(createReservationDto: CreateReservationDto, user: User): Promise<Reservation> {
    const { classId } = createReservationDto;

    // Solo estudiantes pueden hacer reservas
    if (user.role !== Role.STUDENT) {
      throw new BadRequestException('Solo los estudiantes pueden hacer reservas');
    }

    // Verificar que la clase existe
    const classEntity = await this.classRepository.findOne({
      where: { id: classId },
      relations: ['reservations', 'gym'],
    });

    if (!classEntity) {
      throw new NotFoundException('Clase no encontrada');
    }

    // Verificar que el estudiante pertenece al gimnasio de la clase
    if (user.gymId !== classEntity.gymId) {
      throw new BadRequestException('No puedes reservar clases de otros gimnasios');
    }

    // Verificar que la clase no esté en el pasado
    const now = new Date();
    const classDateTime = new Date(`${classEntity.date}T${classEntity.startTime}`);
    
    if (classDateTime <= now) {
      throw new BadRequestException('No puedes reservar clases pasadas');
    }

    // Verificar que el usuario no tenga ya una reserva para esta clase
    const existingReservation = await this.reservationRepository.findOne({
      where: {
        classId,
        studentId: user.id,
        status: ReservationStatus.RESERVED,
      },
    });

    if (existingReservation) {
      throw new BadRequestException('Ya tienes una reserva para esta clase');
    }

    // Verificar cupos disponibles
    const activeReservations = classEntity.reservations.filter(
      r => r.status === ReservationStatus.RESERVED
    );

    if (activeReservations.length >= classEntity.capacity) {
      throw new BadRequestException('No hay cupos disponibles para esta clase');
    }

    // Crear la reserva
    const reservation = this.reservationRepository.create({
      classId,
      studentId: user.id,
      status: ReservationStatus.RESERVED,
    });

    return this.reservationRepository.save(reservation);
  }

  async findMyReservations(user: User): Promise<Reservation[]> {
    return this.reservationRepository.find({
      where: { studentId: user.id },
      relations: ['class', 'class.gym', 'class.discipline', 'class.teacher'],
      order: { createdAt: 'DESC' },
    });
  }

  async cancel(id: string, user: User): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['class'],
    });

    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Verificar que es el dueño de la reserva o un admin
    if (user.role === Role.STUDENT && reservation.studentId !== user.id) {
      throw new ForbiddenException('No puedes cancelar esta reserva');
    }

    if (user.role === Role.ADMIN) {
      // Verificar que la reserva es de su gimnasio
      const classEntity = await this.classRepository.findOne({
        where: { id: reservation.classId },
        relations: ['gym'],
      });
      
      if (classEntity && classEntity.gym.ownerId !== user.id) {
        throw new ForbiddenException('No puedes cancelar reservas de otros gimnasios');
      }
    }

    // Verificar que la reserva esté activa
    if (reservation.status !== ReservationStatus.RESERVED) {
      throw new BadRequestException('Solo se pueden cancelar reservas activas');
    }

    // Verificar que no sea muy tarde para cancelar (ejemplo: no se puede cancelar 2 horas antes)
    const now = new Date();
    const classDateTime = new Date(`${reservation.class.date}T${reservation.class.startTime}`);
    const timeDifference = classDateTime.getTime() - now.getTime();
    const hoursDifference = timeDifference / (1000 * 60 * 60);

    if (hoursDifference < 2 && user.role === Role.STUDENT) {
      throw new BadRequestException('No puedes cancelar la reserva con menos de 2 horas de anticipación');
    }

    reservation.status = ReservationStatus.CANCELED;
    return this.reservationRepository.save(reservation);
  }

  async markAttendance(classId: string, studentId: string, attended: boolean, user: User): Promise<Reservation> {
    // Solo profesores pueden marcar asistencia
    if (user.role !== Role.TEACHER) {
      throw new ForbiddenException('Solo los profesores pueden marcar asistencia');
    }

    // Verificar que el profesor esté asignado a esta clase
    const classEntity = await this.classRepository.findOne({
      where: { id: classId, teacherId: user.id },
    });

    if (!classEntity) {
      throw new NotFoundException('Clase no encontrada o no estás asignado como profesor');
    }

    const reservation = await this.reservationRepository.findOne({
      where: {
        classId,
        studentId,
        status: ReservationStatus.RESERVED,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }

    reservation.status = attended ? ReservationStatus.ATTENDED : ReservationStatus.MISSED;
    return this.reservationRepository.save(reservation);
  }
}