import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Role, ReservationStatus } from '../../common/enums';
import { Class } from '../../entities/class.entity';
import { Reservation } from '../../entities/reservation.entity';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let reservationRepository: jest.Mocked<Repository<Reservation>>;
  let classRepository: jest.Mocked<Repository<Class>>;
  let transactionMock: jest.Mock;

  const createMockTransaction = (txRepos: {
    classRepo?: any;
    reservationRepo?: any;
  }) => {
    return async (callback: (manager: any) => Promise<any>) => {
      return callback({
        getRepository: (entity: any) => {
          if (entity === Class) return txRepos.classRepo;
          if (entity === Reservation) return txRepos.reservationRepo;
          return undefined;
        },
      });
    };
  };

  beforeEach(async () => {
    transactionMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: {
            manager: { transaction: transactionMock },
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Class),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    reservationRepository = module.get(getRepositoryToken(Reservation));
    classRepository = module.get(getRepositoryToken(Class));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const buildClassEntity = (overrides: Partial<Class> = {}): Class =>
      ({
        id: 'class-1',
        gymId: 'gym-1',
        disciplineId: 'discipline-1',
        teacherId: 'teacher-1',
        date: new Date('2026-12-31'),
        startTime: '10:00',
        endTime: '11:00',
        capacity: 10,
        ...overrides,
      }) as Class;

    const buildStudent = (overrides: any = {}) => ({
      id: 'student-1',
      role: Role.STUDENT,
      gymId: 'gym-1',
      ...overrides,
    });

    it('should reject non-student users', async () => {
      const user = { id: 'teacher-1', role: Role.TEACHER, gymId: 'gym-1' };

      await expect(
        service.create({ classId: 'class-1' }, user as any),
      ).rejects.toThrow('Solo los estudiantes pueden hacer reservas');
    });

    it('should throw NotFound when class does not exist', async () => {
      const user = buildStudent();
      const txClassRepo = { findOne: jest.fn().mockResolvedValue(null) };

      transactionMock.mockImplementation(
        createMockTransaction({ classRepo: txClassRepo }),
      );

      await expect(
        service.create({ classId: 'missing-class' }, user),
      ).rejects.toThrow('Clase no encontrada');
    });

    it('should reject reservation for a different gym', async () => {
      const user = buildStudent({ gymId: 'gym-1' });
      const classEntity = buildClassEntity({ gymId: 'gym-2' });
      const txClassRepo = { findOne: jest.fn().mockResolvedValue(classEntity) };

      transactionMock.mockImplementation(
        createMockTransaction({ classRepo: txClassRepo }),
      );

      await expect(
        service.create({ classId: 'class-1' }, user),
      ).rejects.toThrow('No puedes reservar clases de otros gimnasios');
    });

    it('should reject reservation for a past class', async () => {
      const user = buildStudent();
      const classEntity = buildClassEntity({
        date: new Date('2020-01-01'),
        startTime: '00:00',
      });
      const txClassRepo = { findOne: jest.fn().mockResolvedValue(classEntity) };

      transactionMock.mockImplementation(
        createMockTransaction({ classRepo: txClassRepo }),
      );

      await expect(
        service.create({ classId: 'class-1' }, user),
      ).rejects.toThrow('No puedes reservar clases pasadas');
    });

    it('should reject duplicate active reservation for the same student and class', async () => {
      const user = buildStudent();
      const classEntity = buildClassEntity();
      const txClassRepo = { findOne: jest.fn().mockResolvedValue(classEntity) };
      const txReservationRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'existing-reservation' }),
        count: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };

      transactionMock.mockImplementation(
        createMockTransaction({
          classRepo: txClassRepo,
          reservationRepo: txReservationRepo,
        }),
      );

      await expect(
        service.create({ classId: 'class-1' }, user),
      ).rejects.toThrow('Ya tienes una reserva para esta clase');
      expect(txReservationRepo.count).not.toHaveBeenCalled();
    });

    it('should reject reservation when class is at capacity', async () => {
      const user = buildStudent();
      const classEntity = buildClassEntity({ capacity: 5 });
      const txClassRepo = { findOne: jest.fn().mockResolvedValue(classEntity) };
      const txReservationRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(5),
        create: jest.fn(),
        save: jest.fn(),
      };

      transactionMock.mockImplementation(
        createMockTransaction({
          classRepo: txClassRepo,
          reservationRepo: txReservationRepo,
        }),
      );

      await expect(
        service.create({ classId: 'class-1' }, user),
      ).rejects.toThrow('No hay cupos disponibles para esta clase');
    });

    it('should create a reservation when capacity is available', async () => {
      const user = buildStudent();
      const classEntity = buildClassEntity({ capacity: 10 });
      const txClassRepo = { findOne: jest.fn().mockResolvedValue(classEntity) };
      const createdReservation = {
        id: 'reservation-1',
        classId: 'class-1',
        studentId: 'student-1',
        status: ReservationStatus.RESERVED,
      };
      const txReservationRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(5),
        create: jest.fn().mockReturnValue(createdReservation),
        save: jest.fn().mockResolvedValue(createdReservation),
      };

      transactionMock.mockImplementation(
        createMockTransaction({
          classRepo: txClassRepo,
          reservationRepo: txReservationRepo,
        }),
      );

      const result = await service.create({ classId: 'class-1' }, user);

      expect(result).toEqual(createdReservation);
      expect(txClassRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'class-1' },
          lock: { mode: 'pessimistic_write' },
        }),
      );
      expect(txReservationRepo.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { classId: 'class-1', status: ReservationStatus.RESERVED },
        }),
      );
      expect(txReservationRepo.create).toHaveBeenCalledWith({
        classId: 'class-1',
        studentId: 'student-1',
        status: ReservationStatus.RESERVED,
      });
      expect(txReservationRepo.save).toHaveBeenCalledWith(createdReservation);
    });

    it('should allow rebooking after a cancellation for the same student and class', async () => {
      const user = buildStudent();
      const classEntity = buildClassEntity({ capacity: 1 });
      const rebookedReservation = {
        id: 'reservation-rebooked',
        classId: 'class-1',
        studentId: 'student-1',
        status: ReservationStatus.RESERVED,
      };
      const txClassRepo = { findOne: jest.fn().mockResolvedValue(classEntity) };
      const txReservationRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockReturnValue(rebookedReservation),
        save: jest.fn().mockResolvedValue(rebookedReservation),
      };

      transactionMock.mockImplementation(
        createMockTransaction({
          classRepo: txClassRepo,
          reservationRepo: txReservationRepo,
        }),
      );

      const result = await service.create({ classId: 'class-1' }, user);

      expect(result.status).toBe(ReservationStatus.RESERVED);
      expect(txReservationRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            classId: 'class-1',
            studentId: 'student-1',
            status: ReservationStatus.RESERVED,
          },
        }),
      );
    });

    it('should convert unique violation error to conflict response', async () => {
      const user = buildStudent();
      const classEntity = buildClassEntity();
      const txClassRepo = { findOne: jest.fn().mockResolvedValue(classEntity) };
      const txReservationRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(3),
        create: jest.fn().mockReturnValue({}),
        save: jest.fn().mockImplementation(() => {
          const error = new QueryFailedError(
            'INSERT',
            [],
            new Error('duplicate key value'),
          ) as any;
          error.code = '23505';
          throw error;
        }),
      };

      transactionMock.mockImplementation(
        createMockTransaction({
          classRepo: txClassRepo,
          reservationRepo: txReservationRepo,
        }),
      );

      await expect(
        service.create({ classId: 'class-1' }, user),
      ).rejects.toThrow('Ya tienes una reserva para esta clase');
    });

    it('should rethrow non-unique database errors', async () => {
      const user = buildStudent();
      const classEntity = buildClassEntity();
      const txClassRepo = { findOne: jest.fn().mockResolvedValue(classEntity) };
      const txReservationRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(3),
        create: jest.fn().mockReturnValue({}),
        save: jest.fn().mockImplementation(() => {
          const error = new QueryFailedError(
            'INSERT',
            [],
            new Error('some db error'),
          ) as any;
          error.code = '42601';
          throw error;
        }),
      };

      transactionMock.mockImplementation(
        createMockTransaction({
          classRepo: txClassRepo,
          reservationRepo: txReservationRepo,
        }),
      );

      await expect(
        service.create({ classId: 'class-1' }, user),
      ).rejects.toBeInstanceOf(QueryFailedError);
    });
  });
});
