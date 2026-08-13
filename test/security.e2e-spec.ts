import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  INestApplication,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from './../src/app.module';
import { ReservationStatus, Role } from './../src/common/enums';
import { Class } from './../src/entities/class.entity';
import { Discipline } from './../src/entities/discipline.entity';
import { Gym } from './../src/entities/gym.entity';
import { Reservation } from './../src/entities/reservation.entity';
import { User } from './../src/entities/user.entity';
import { FirebaseAuthGuard } from './../src/modules/auth/firebase-auth.guard';
import * as firebaseAdminConfig from './../src/modules/auth/firebase-admin.config';

jest.setTimeout(30000);

@Injectable()
class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const userHeader = req.headers['x-test-user'];
    req.user = userHeader
      ? JSON.parse(userHeader)
      : {
          uid: 'default-uid',
          id: 'default-user',
          email: 'default@test.com',
          role: Role.STUDENT,
          gymId: 'default-gym',
        };
    return true;
  }
}

describe('Security (e2e)', () => {
  let app: INestApplication;
  let gymRepository: Repository<Gym>;
  let userRepository: Repository<User>;
  let disciplineRepository: Repository<Discipline>;
  let classRepository: Repository<Class>;
  let reservationRepository: Repository<Reservation>;

  let superAdmin: User;
  let ownerA: User;
  let ownerB: User;
  let teacherA: User;
  let teacherB: User;
  let studentA: User;
  let studentB: User;
  let targetUser: User;
  let gymA: Gym;
  let gymB: Gym;
  let disciplineA: Discipline;
  let disciplineB: Discipline;
  let classA: Class;
  let classB: Class;
  let reservationA: Reservation;
  let reservationB: Reservation;

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
      uid: user.firebase_uid,
      id: user.id,
      email: user.email,
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();

    // Mock Firebase Admin so role-assignment tests can run without real Firebase.
    jest.spyOn(firebaseAdminConfig, 'getFirebaseAdmin').mockReturnValue({
      auth: () => ({
        setCustomUserClaims: jest.fn().mockResolvedValue(undefined),
      }),
    } as any);

    gymRepository = app.get(getRepositoryToken(Gym));
    userRepository = app.get(getRepositoryToken(User));
    disciplineRepository = app.get(getRepositoryToken(Discipline));
    classRepository = app.get(getRepositoryToken(Class));
    reservationRepository = app.get(getRepositoryToken(Reservation));

    superAdmin = createUser(Role.SUPER_ADMIN, null);
    ownerA = createUser(Role.OWNER_GYM, null);
    ownerB = createUser(Role.OWNER_GYM, null);
    teacherA = createUser(Role.TEACHER, null);
    teacherB = createUser(Role.TEACHER, null);
    studentA = createUser(Role.STUDENT, null);
    studentB = createUser(Role.STUDENT, null);
    targetUser = createUser(Role.STUDENT, null);

    await userRepository.save([
      superAdmin,
      ownerA,
      ownerB,
      teacherA,
      teacherB,
      studentA,
      studentB,
      targetUser,
    ]);

    gymA = new Gym();
    gymA.id = uuidv4();
    gymA.name = 'Security Gym A';
    gymA.address = 'Address A';
    gymA.contact = 'contact-a';
    gymA.ownerId = ownerA.id;

    gymB = new Gym();
    gymB.id = uuidv4();
    gymB.name = 'Security Gym B';
    gymB.address = 'Address B';
    gymB.contact = 'contact-b';
    gymB.ownerId = ownerB.id;

    await gymRepository.save([gymA, gymB]);

    ownerA.gymId = gymA.id;
    ownerB.gymId = gymB.id;
    teacherA.gymId = gymA.id;
    teacherB.gymId = gymB.id;
    studentA.gymId = gymA.id;
    studentB.gymId = gymB.id;
    targetUser.gymId = gymA.id;
    await userRepository.save([
      ownerA,
      ownerB,
      teacherA,
      teacherB,
      studentA,
      studentB,
      targetUser,
    ]);

    disciplineA = new Discipline();
    disciplineA.id = uuidv4();
    disciplineA.name = 'Discipline A';
    disciplineA.gymId = gymA.id;

    disciplineB = new Discipline();
    disciplineB.id = uuidv4();
    disciplineB.name = 'Discipline B';
    disciplineB.gymId = gymB.id;

    await disciplineRepository.save([disciplineA, disciplineB]);

    const futureDate = new Date('2030-01-01');

    classA = new Class();
    classA.id = uuidv4();
    classA.gymId = gymA.id;
    classA.disciplineId = disciplineA.id;
    classA.teacherId = teacherA.id;
    classA.date = futureDate;
    classA.startTime = '09:00';
    classA.endTime = '10:00';
    classA.capacity = 10;

    classB = new Class();
    classB.id = uuidv4();
    classB.gymId = gymB.id;
    classB.disciplineId = disciplineB.id;
    classB.teacherId = teacherB.id;
    classB.date = futureDate;
    classB.startTime = '09:00';
    classB.endTime = '10:00';
    classB.capacity = 10;

    await classRepository.save([classA, classB]);

    reservationA = reservationRepository.create({
      classId: classA.id,
      studentId: studentA.id,
      status: ReservationStatus.RESERVED,
    });
    reservationB = reservationRepository.create({
      classId: classB.id,
      studentId: studentB.id,
      status: ReservationStatus.RESERVED,
    });

    await reservationRepository.save([reservationA, reservationB]);
  });

  afterAll(async () => {
    await reservationRepository.delete({
      classId: classA.id,
    });
    await reservationRepository.delete({
      classId: classB.id,
    });
    await classRepository.delete([classA.id, classB.id]);
    await disciplineRepository.delete([disciplineA.id, disciplineB.id]);

    await userRepository.update(
      [
        ownerA.id,
        ownerB.id,
        teacherA.id,
        teacherB.id,
        studentA.id,
        studentB.id,
        targetUser.id,
      ],
      { gymId: null },
    );
    await gymRepository.delete([gymA.id, gymB.id]);
    await userRepository.delete([
      superAdmin.id,
      ownerA.id,
      ownerB.id,
      teacherA.id,
      teacherB.id,
      studentA.id,
      studentB.id,
      targetUser.id,
    ]);

    jest.restoreAllMocks();
    await app.close();
  });

  describe('RBAC enforcement', () => {
    it('STUDENT cannot create a discipline', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/disciplines')
        .set(authHeader(studentA))
        .send({ name: 'Hacked', gymId: gymA.id })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('STUDENT cannot create a class', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set(authHeader(studentA))
        .send({
          gymId: gymA.id,
          disciplineId: disciplineA.id,
          teacherId: teacherA.id,
          date: '2030-01-01',
          startTime: '09:00',
          endTime: '10:00',
          capacity: 5,
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('STUDENT cannot create a gym', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/gyms')
        .set(authHeader(studentA))
        .send({ name: 'Hacked', address: 'Addr', contact: '123' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('STUDENT cannot add users to a gym', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/users/${gymA.id}/add-to-gym`)
        .set(authHeader(studentA))
        .send({ emails: [studentB.email] })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('STUDENT cannot assign roles', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/assign-role')
        .set(authHeader(studentA))
        .send({ uid: targetUser.firebase_uid, role: Role.OWNER_GYM })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('STUDENT cannot mark attendance', async () => {
      await request(app.getHttpServer())
        .put(
          `/api/v1/reservations/${classA.id}/students/${studentA.id}/attendance`,
        )
        .set(authHeader(studentA))
        .query({ attended: true })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('TEACHER cannot create a gym', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/gyms')
        .set(authHeader(teacherA))
        .send({ name: 'Hacked', address: 'Addr', contact: '123' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('TEACHER cannot add users to a gym', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/users/${gymA.id}/add-to-gym`)
        .set(authHeader(teacherA))
        .send({ emails: [studentB.email] })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('OWNER_GYM cannot assign roles', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/assign-role')
        .set(authHeader(ownerA))
        .send({ uid: targetUser.firebase_uid, role: Role.OWNER_GYM })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('SUPER_ADMIN can assign privileged roles', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users/assign-role')
        .set(authHeader(superAdmin))
        .send({
          uid: targetUser.firebase_uid,
          role: Role.TEACHER,
          gymId: gymA.id,
        })
        .expect(HttpStatus.OK);

      expect(response.body.role).toBe(Role.TEACHER);
    });
  });

  describe('Multi-tenancy / IDOR', () => {
    it('OWNER_GYM cannot access a gym they do not own', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/gyms/${gymB.id}`)
        .set(authHeader(ownerA))
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('OWNER_GYM cannot update a gym they do not own', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/gyms/${gymB.id}`)
        .set(authHeader(ownerA))
        .send({ name: 'Hacked' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('STUDENT cannot list all gyms', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/gyms')
        .set(authHeader(studentA))
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('STUDENT can only access their own gym', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/gyms/${gymA.id}`)
        .set(authHeader(studentA))
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .get(`/api/v1/gyms/${gymB.id}`)
        .set(authHeader(studentA))
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('OWNER_GYM cannot create a class in another gym', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set(authHeader(ownerA))
        .send({
          gymId: gymB.id,
          disciplineId: disciplineB.id,
          teacherId: teacherB.id,
          date: '2030-01-01',
          startTime: '09:00',
          endTime: '10:00',
          capacity: 5,
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('OWNER_GYM cannot update a class in another gym', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/classes/${classB.id}`)
        .set(authHeader(ownerA))
        .send({ capacity: 99 })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('OWNER_GYM cannot delete a class in another gym', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/classes/${classB.id}`)
        .set(authHeader(ownerA))
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('OWNER_GYM cannot associate a class with a discipline from another gym', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set(authHeader(ownerA))
        .send({
          gymId: gymA.id,
          disciplineId: disciplineB.id,
          teacherId: teacherA.id,
          date: '2030-01-01',
          startTime: '09:00',
          endTime: '10:00',
          capacity: 5,
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('OWNER_GYM cannot associate a class with a teacher from another gym', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set(authHeader(ownerA))
        .send({
          gymId: gymA.id,
          disciplineId: disciplineA.id,
          teacherId: teacherB.id,
          date: '2030-01-01',
          startTime: '09:00',
          endTime: '10:00',
          capacity: 5,
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('OWNER_GYM cannot move a class discipline to another gym', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/classes/${classA.id}`)
        .set(authHeader(ownerA))
        .send({ disciplineId: disciplineB.id })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('STUDENT cannot access a class from another gym', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/classes/${classB.id}`)
        .set(authHeader(studentA))
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('STUDENT cannot reserve a class from another gym', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set(authHeader(studentA))
        .send({ classId: classB.id })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('STUDENT cannot cancel another students reservation', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/reservations/${reservationB.id}/cancel`)
        .set(authHeader(studentA))
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('TEACHER cannot mark attendance in a class from another gym', async () => {
      await request(app.getHttpServer())
        .put(
          `/api/v1/reservations/${classB.id}/students/${studentB.id}/attendance`,
        )
        .set(authHeader(teacherA))
        .query({ attended: true })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('OWNER_GYM cannot mark attendance in a class from another gym', async () => {
      await request(app.getHttpServer())
        .put(
          `/api/v1/reservations/${classB.id}/students/${studentB.id}/attendance`,
        )
        .set(authHeader(ownerA))
        .query({ attended: true })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('arbitrary studentId cannot be used to modify another tenants attendance', async () => {
      await request(app.getHttpServer())
        .put(
          `/api/v1/reservations/${classB.id}/students/${studentA.id}/attendance`,
        )
        .set(authHeader(ownerB))
        .query({ attended: true })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('Gym A owner cannot add users to Gym B', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/${gymB.id}/add-to-gym`)
        .set(authHeader(ownerA))
        .send({ emails: [studentA.email] })
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.body.message).toMatch(
        /No tienes permisos para este gimnasio/,
      );
    });
  });
});
