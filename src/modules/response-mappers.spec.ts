import { Class } from '../entities/class.entity';
import { Discipline } from '../entities/discipline.entity';
import { Gym } from '../entities/gym.entity';
import { Invitation } from '../entities/invitation.entity';
import { Reservation } from '../entities/reservation.entity';
import { User } from '../entities/user.entity';
import { Role, ReservationStatus, InvitationStatus } from '../common/enums';
import { ClassMapper } from './classes/class.mapper';
import { DisciplineMapper } from './disciplines/discipline.mapper';
import { GymMapper } from './gyms/gym.mapper';
import { InvitationMapper } from './invitations/invitation.mapper';
import { ReservationMapper } from './reservations/reservation.mapper';
import { UserMapper } from './users/user.mapper';

describe('response mapper allow-lists', () => {
  it('maps User without internal fields or relations', () => {
    const entity = Object.assign(new User(), {
      id: 'user-id',
      name: 'User',
      email: 'user@example.com',
      role: Role.STUDENT,
      gymId: 'gym-id',
      firebase_uid: 'firebase-secret',
      deletedAt: new Date(),
      gym: { id: 'gym-id' },
      reservations: [{ id: 'reservation-id' }],
    });
    const response = UserMapper.toResponse(entity);
    expect(response).toEqual({
      id: 'user-id',
      name: 'User',
      email: 'user@example.com',
      role: Role.STUDENT,
      gymId: 'gym-id',
    });
    expect(response).not.toHaveProperty('firebase_uid');
    expect(response).not.toHaveProperty('deletedAt');
  });

  it('maps Gym without owner and collection relations', () => {
    const entity = Object.assign(new Gym(), {
      id: 'gym-id',
      name: 'Gym',
      address: 'Address',
      contact: 'Contact',
      ownerId: 'owner-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      owner: { email: 'owner@example.com' },
      users: [],
      classes: [],
    });
    expect(GymMapper.toResponse(entity)).toEqual(
      expect.objectContaining({ id: 'gym-id', ownerId: 'owner-id' }),
    );
    expect(GymMapper.toResponse(entity)).not.toHaveProperty('owner');
    expect(GymMapper.toResponse(entity)).not.toHaveProperty('users');
  });

  it('maps Class with controlled summaries only', () => {
    const entity = Object.assign(new Class(), {
      id: 'class-id',
      gymId: 'gym-id',
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      capacity: 10,
      discipline: { id: 'discipline-id', name: 'Yoga', classes: [] },
      teacher: { id: 'teacher-id', name: 'Teacher', firebase_uid: 'secret' },
      reservations: [],
      gym: { id: 'gym-id' },
    });
    const response = ClassMapper.toResponse(entity);
    expect(response.discipline).toEqual({ id: 'discipline-id', name: 'Yoga' });
    expect(response.teacher).toEqual({ id: 'teacher-id', name: 'Teacher' });
    expect(response).not.toHaveProperty('reservations');
    expect(response.teacher).not.toHaveProperty('firebase_uid');
  });

  it('maps Reservation without student or gym relations', () => {
    const entity = Object.assign(new Reservation(), {
      id: 'reservation-id',
      classId: 'class-id',
      studentId: 'student-id',
      status: ReservationStatus.RESERVED,
      createdAt: new Date(),
      student: { email: 'student@example.com' },
      class: {
        id: 'class-id',
        gymId: 'gym-id',
        date: new Date(),
        startTime: '09:00',
        endTime: '10:00',
        reservations: [],
        gym: { id: 'gym-id' },
      },
    });
    const response = ReservationMapper.toResponse(entity);
    expect(response).not.toHaveProperty('student');
    expect(response.class).not.toHaveProperty('gym');
    expect(response.class).not.toHaveProperty('reservations');
  });

  it('maps Discipline without deletedAt or relations', () => {
    const entity = Object.assign(new Discipline(), {
      id: 'discipline-id',
      name: 'Yoga',
      description: null,
      gymId: 'gym-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(),
      gym: { id: 'gym-id' },
      classes: [],
    });
    const response = DisciplineMapper.toResponse(entity);
    expect(response).not.toHaveProperty('deletedAt');
    expect(response).not.toHaveProperty('gym');
    expect(response).not.toHaveProperty('classes');
  });

  it('maps Invitation without usedByUserId', () => {
    const entity = Object.assign(new Invitation(), {
      id: 'invitation-token',
      gymId: 'gym-id',
      email: 'student@example.com',
      status: InvitationStatus.PENDING,
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      usedByUserId: 'internal-user-id',
    });
    const response = InvitationMapper.toResponse(entity);
    expect(response).not.toHaveProperty('usedByUserId');
    expect(response.id).toBe('invitation-token');
  });
});
