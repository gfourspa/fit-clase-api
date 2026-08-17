import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  INestApplication,
  Injectable,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from './../src/app.module';
import { ReservationStatus, Role } from './../src/common/enums';

jest.setTimeout(30000);
import { Class } from './../src/entities/class.entity';
import { Discipline } from './../src/entities/discipline.entity';
import { Gym } from './../src/entities/gym.entity';
import { Reservation } from './../src/entities/reservation.entity';
import { assertNoForbiddenKeys } from './helpers/response-boundary';
import { User } from './../src/entities/user.entity';
import { FirebaseAuthGuard } from './../src/modules/auth/firebase-auth.guard';

@Injectable()
class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const userHeader = req.headers['x-test-user'];
    req.user = userHeader
      ? JSON.parse(userHeader)
      : { id: 'default-student', role: Role.STUDENT, gymId: 'default-gym' };
    return true;
  }
}

describe('ReservationsController (e2e)', () => {
  let app: INestApplication;
  let gymRepository: Repository<Gym>;
  let disciplineRepository: Repository<Discipline>;
  let userRepository: Repository<User>;
  let classRepository: Repository<Class>;
  let reservationRepository: Repository<Reservation>;

  let gym: Gym;
  let owner: User;
  let teacher: User;
  let discipline: Discipline;
  let testClass: Class;
  let studentA: User;
  let studentB: User;

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const futureDateString = futureDate.toISOString().split('T')[0];

  const createUser = (role: Role, gymId: string | null): User => {
    const user = new User();
    user.id = uuidv4();
    user.firebase_uid = uuidv4();
    user.email = `${user.id}@test.com`;
    user.name = 'Test User';
    user.role = role;
    user.gymId = gymId;
    return user;
  };

  const authHeader = (user: User) => ({
    'x-test-user': JSON.stringify({
      id: user.id,
      role: user.role,
      gymId: user.gymId,
    }),
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useClass(TestAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    gymRepository = app.get(getRepositoryToken(Gym));
    disciplineRepository = app.get(getRepositoryToken(Discipline));
    userRepository = app.get(getRepositoryToken(User));
    classRepository = app.get(getRepositoryToken(Class));
    reservationRepository = app.get(getRepositoryToken(Reservation));

    owner = createUser(Role.OWNER_GYM, null);
    await userRepository.save(owner);

    gym = new Gym();
    gym.id = uuidv4();
    gym.name = 'Test Gym';
    gym.address = '123 Test St';
    gym.contact = '555-1234';
    gym.ownerId = owner.id;
    await gymRepository.save(gym);

    owner.gymId = gym.id;
    await userRepository.save(owner);

    teacher = createUser(Role.TEACHER, gym.id);
    await userRepository.save(teacher);

    discipline = new Discipline();
    discipline.id = uuidv4();
    discipline.name = 'Yoga';
    discipline.description = 'Test discipline';
    discipline.gymId = gym.id;
    await disciplineRepository.save(discipline);

    testClass = new Class();
    testClass.id = uuidv4();
    testClass.gymId = gym.id;
    testClass.disciplineId = discipline.id;
    testClass.teacherId = teacher.id;
    testClass.date = futureDate;
    testClass.startTime = '10:00';
    testClass.endTime = '11:00';
    testClass.capacity = 1;
    await classRepository.save(testClass);

    studentA = createUser(Role.STUDENT, gym.id);
    studentB = createUser(Role.STUDENT, gym.id);
    await userRepository.save([studentA, studentB]);
  });

  afterAll(async () => {
    if (testClass) {
      await reservationRepository.delete({ classId: testClass.id });
      await classRepository.delete(testClass.id);
    }
    if (discipline) await disciplineRepository.delete(discipline.id);

    // Romper referencias circulares: users.gymId -> gym.id y gym.ownerId -> users.id
    const testUserIds = [
      studentA?.id,
      studentB?.id,
      teacher?.id,
      owner?.id,
    ].filter(Boolean);
    if (testUserIds.length > 0) {
      await userRepository.update(testUserIds, { gymId: null });
    }

    if (gym) await gymRepository.delete(gym.id);
    if (testUserIds.length > 0) {
      await userRepository.delete(testUserIds);
    }

    await app.close();
  });

  describe('POST /api/v1/reservations', () => {
    it('should create a reservation for an available class', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set(authHeader(studentA))
        .send({ classId: testClass.id })
        .expect(HttpStatus.CREATED);

      expect(response.body.classId).toBe(testClass.id);
      expect(response.body.studentId).toBe(studentA.id);
      expect(response.body.status).toBe('RESERVED');
      assertNoForbiddenKeys(response.body);
      expect(response.body).not.toHaveProperty('student');
      expect(response.body).not.toHaveProperty('gym');
      expect(response.body).not.toHaveProperty('class.reservations');
    });

    it('should reject duplicate active reservation for the same student and class', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set(authHeader(studentA))
        .send({ classId: testClass.id })
        .expect(HttpStatus.CONFLICT);
    });

    it('should allow rebooking after cancellation', async () => {
      const reservation = await reservationRepository.findOne({
        where: {
          classId: testClass.id,
          studentId: studentA.id,
          status: ReservationStatus.RESERVED,
        },
      });

      await request(app.getHttpServer())
        .put(`/api/v1/reservations/${reservation!.id}/cancel`)
        .set(authHeader(studentA))
        .expect(HttpStatus.OK);

      const response = await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set(authHeader(studentA))
        .send({ classId: testClass.id })
        .expect(HttpStatus.CREATED);

      expect(response.body.studentId).toBe(studentA.id);
      expect(response.body.status).toBe('RESERVED');
      assertNoForbiddenKeys(response.body);
    });

    it('should return only the current student reservations with controlled class summaries', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/reservations/my-reservations')
        .set(authHeader(studentA))
        .expect(HttpStatus.OK);

      expect(response.body.length).toBeGreaterThan(0);
      response.body.forEach((reservation: Record<string, unknown>) => {
        expect(reservation.studentId).toBe(studentA.id);
        assertNoForbiddenKeys(reservation);
        expect(reservation).not.toHaveProperty('student');
        expect(reservation).not.toHaveProperty('gym');
        expect(reservation).not.toHaveProperty('class.reservations');
      });
    });

    it('should allow only one concurrent reservation when capacity is one', async () => {
      // Ensure the class is fresh and no active reservations exist
      await reservationRepository.delete({ classId: testClass.id });

      const [responseA, responseB] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/v1/reservations')
          .set(authHeader(studentA))
          .send({ classId: testClass.id }),
        request(app.getHttpServer())
          .post('/api/v1/reservations')
          .set(authHeader(studentB))
          .send({ classId: testClass.id }),
      ]);

      const successCount = [responseA, responseB].filter(
        (r) => r.status === HttpStatus.CREATED,
      ).length;
      const failureCount = [responseA, responseB].filter(
        (r) => r.status === HttpStatus.BAD_REQUEST,
      ).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      const activeReservations = await reservationRepository.count({
        where: { classId: testClass.id, status: ReservationStatus.RESERVED },
      });
      expect(activeReservations).toBe(1);
    });

    it('should deterministically enforce capacity across repeated concurrent attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await reservationRepository.delete({ classId: testClass.id });

        const [responseA, responseB] = await Promise.all([
          request(app.getHttpServer())
            .post('/api/v1/reservations')
            .set(authHeader(studentA))
            .send({ classId: testClass.id }),
          request(app.getHttpServer())
            .post('/api/v1/reservations')
            .set(authHeader(studentB))
            .send({ classId: testClass.id }),
        ]);

        const successCount = [responseA, responseB].filter(
          (r) => r.status === HttpStatus.CREATED,
        ).length;
        const failureCount = [responseA, responseB].filter(
          (r) => r.status === HttpStatus.BAD_REQUEST,
        ).length;

        expect(successCount).toBe(1);
        expect(failureCount).toBe(1);

        const activeReservations = await reservationRepository.count({
          where: { classId: testClass.id, status: ReservationStatus.RESERVED },
        });
        expect(activeReservations).toBe(1);
      }
    });
  });

  describe('PUT /api/v1/reservations/:classId/students/:studentId/attendance', () => {
    let ownerB: User;
    let superAdmin: User;
    let teacherB: User;
    let studentC: User;
    let gymB: Gym;
    let attendanceClassA: Class;
    let attendanceClassB: Class;
    let reservationA1: Reservation;
    let reservationA2: Reservation;
    let reservationB1: Reservation;

    beforeAll(async () => {
      ownerB = createUser(Role.OWNER_GYM, null);
      superAdmin = createUser(Role.SUPER_ADMIN, null);
      teacherB = createUser(Role.TEACHER, null);
      studentC = createUser(Role.STUDENT, null);
      await userRepository.save([ownerB, superAdmin, teacherB, studentC]);

      gymB = new Gym();
      gymB.id = uuidv4();
      gymB.name = 'Gym B';
      gymB.address = 'Address B';
      gymB.contact = 'contact-b';
      gymB.ownerId = ownerB.id;
      await gymRepository.save(gymB);

      ownerB.gymId = gymB.id;
      teacherB.gymId = gymB.id;
      studentC.gymId = gymB.id;
      await userRepository.save([ownerB, teacherB, studentC]);

      attendanceClassA = new Class();
      attendanceClassA.id = uuidv4();
      attendanceClassA.gymId = gym.id;
      attendanceClassA.disciplineId = discipline.id;
      attendanceClassA.teacherId = teacher.id;
      attendanceClassA.date = futureDate;
      attendanceClassA.startTime = '12:00';
      attendanceClassA.endTime = '13:00';
      attendanceClassA.capacity = 2;

      attendanceClassB = new Class();
      attendanceClassB.id = uuidv4();
      attendanceClassB.gymId = gymB.id;
      attendanceClassB.disciplineId = discipline.id;
      attendanceClassB.teacherId = teacherB.id;
      attendanceClassB.date = futureDate;
      attendanceClassB.startTime = '12:00';
      attendanceClassB.endTime = '13:00';
      attendanceClassB.capacity = 1;

      await classRepository.save([attendanceClassA, attendanceClassB]);

      reservationA1 = reservationRepository.create({
        classId: attendanceClassA.id,
        studentId: studentA.id,
        status: ReservationStatus.RESERVED,
      });
      reservationA2 = reservationRepository.create({
        classId: attendanceClassA.id,
        studentId: studentB.id,
        status: ReservationStatus.RESERVED,
      });
      reservationB1 = reservationRepository.create({
        classId: attendanceClassB.id,
        studentId: studentC.id,
        status: ReservationStatus.RESERVED,
      });

      await reservationRepository.save([
        reservationA1,
        reservationA2,
        reservationB1,
      ]);
    });

    afterAll(async () => {
      await reservationRepository.delete({
        classId: attendanceClassA.id,
      });
      await reservationRepository.delete({
        classId: attendanceClassB.id,
      });
      await classRepository.delete([attendanceClassA.id, attendanceClassB.id]);

      await userRepository.update([ownerB.id, teacherB.id, studentC.id], {
        gymId: null,
      });
      await gymRepository.delete(gymB.id);
      await userRepository.delete([
        ownerB.id,
        superAdmin.id,
        teacherB.id,
        studentC.id,
      ]);
    });

    it('should allow OWNER_GYM to mark attendance for their own gym', async () => {
      const response = await request(app.getHttpServer())
        .put(
          `/api/v1/reservations/${attendanceClassA.id}/students/${studentA.id}/attendance`,
        )
        .set(authHeader(owner))
        .query({ attended: true })
        .expect(HttpStatus.OK);

      expect(response.body.status).toBe(ReservationStatus.ATTENDED);
      assertNoForbiddenKeys(response.body);
      expect(response.body).not.toHaveProperty('student');
      expect(response.body).not.toHaveProperty('gym');
    });

    it('should allow TEACHER to mark attendance for their class', async () => {
      const response = await request(app.getHttpServer())
        .put(
          `/api/v1/reservations/${attendanceClassA.id}/students/${studentB.id}/attendance`,
        )
        .set(authHeader(teacher))
        .query({ attended: false })
        .expect(HttpStatus.OK);

      expect(response.body.status).toBe(ReservationStatus.MISSED);
      assertNoForbiddenKeys(response.body);
      expect(response.body).not.toHaveProperty('student');
    });

    it('should not allow OWNER_GYM to mark attendance in another gym', async () => {
      await request(app.getHttpServer())
        .put(
          `/api/v1/reservations/${attendanceClassB.id}/students/${studentC.id}/attendance`,
        )
        .set(authHeader(owner))
        .query({ attended: true })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should not allow TEACHER to mark attendance in a class they do not teach', async () => {
      await request(app.getHttpServer())
        .put(
          `/api/v1/reservations/${attendanceClassB.id}/students/${studentC.id}/attendance`,
        )
        .set(authHeader(teacher))
        .query({ attended: true })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should allow SUPER_ADMIN to mark attendance globally', async () => {
      const response = await request(app.getHttpServer())
        .put(
          `/api/v1/reservations/${attendanceClassB.id}/students/${studentC.id}/attendance`,
        )
        .set(authHeader(superAdmin))
        .query({ attended: true })
        .expect(HttpStatus.OK);

      expect(response.body.status).toBe(ReservationStatus.ATTENDED);
      assertNoForbiddenKeys(response.body);
    });

    it('should reject STUDENT with 403', async () => {
      await request(app.getHttpServer())
        .put(
          `/api/v1/reservations/${attendanceClassA.id}/students/${studentA.id}/attendance`,
        )
        .set(authHeader(studentA))
        .query({ attended: true })
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
