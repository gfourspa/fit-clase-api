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
import { Role } from './../src/common/enums';
import { Discipline } from './../src/entities/discipline.entity';
import { Gym } from './../src/entities/gym.entity';
import { User } from './../src/entities/user.entity';
import { FirebaseAuthGuard } from './../src/modules/auth/firebase-auth.guard';
import { assertNoForbiddenKeys } from './helpers/response-boundary';

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

describe('DisciplinesController (e2e)', () => {
  let app: INestApplication;
  let gymRepository: Repository<Gym>;
  let userRepository: Repository<User>;
  let disciplineRepository: Repository<Discipline>;

  let ownerA: User;
  let ownerB: User;
  let superAdmin: User;
  let studentA: User;
  let teacherA: User;
  let gymA: Gym;
  let gymB: Gym;
  let disciplineA: Discipline;
  let disciplineB: Discipline;

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
    await app.init();

    gymRepository = app.get(getRepositoryToken(Gym));
    userRepository = app.get(getRepositoryToken(User));
    disciplineRepository = app.get(getRepositoryToken(Discipline));

    ownerA = createUser(Role.OWNER_GYM, null);
    ownerB = createUser(Role.OWNER_GYM, null);
    superAdmin = createUser(Role.SUPER_ADMIN, null);
    studentA = createUser(Role.STUDENT, null);
    teacherA = createUser(Role.TEACHER, null);
    await userRepository.save([ownerA, ownerB, superAdmin, studentA, teacherA]);

    gymA = new Gym();
    gymA.id = uuidv4();
    gymA.name = 'Gym A';
    gymA.address = 'Address A';
    gymA.contact = 'contact-a';
    gymA.ownerId = ownerA.id;

    gymB = new Gym();
    gymB.id = uuidv4();
    gymB.name = 'Gym B';
    gymB.address = 'Address B';
    gymB.contact = 'contact-b';
    gymB.ownerId = ownerB.id;

    await gymRepository.save([gymA, gymB]);

    ownerA.gymId = gymA.id;
    ownerB.gymId = gymB.id;
    studentA.gymId = gymA.id;
    teacherA.gymId = gymA.id;
    await userRepository.save([ownerA, ownerB, studentA, teacherA]);

    disciplineA = new Discipline();
    disciplineA.id = uuidv4();
    disciplineA.name = 'Yoga A';
    disciplineA.description = 'Yoga in Gym A';
    disciplineA.gymId = gymA.id;

    disciplineB = new Discipline();
    disciplineB.id = uuidv4();
    disciplineB.name = 'CrossFit B';
    disciplineB.description = 'CrossFit in Gym B';
    disciplineB.gymId = gymB.id;

    await disciplineRepository.save([disciplineA, disciplineB]);
  });

  afterAll(async () => {
    await disciplineRepository.delete([disciplineA.id, disciplineB.id]);

    await userRepository.update(ownerA.id, { gymId: null });
    await userRepository.update(ownerB.id, { gymId: null });
    await userRepository.update(studentA.id, { gymId: null });
    await userRepository.update(teacherA.id, { gymId: null });

    await gymRepository.delete([gymA.id, gymB.id]);
    await userRepository.delete([
      ownerA.id,
      ownerB.id,
      superAdmin.id,
      studentA.id,
      teacherA.id,
    ]);

    await app.close();
  });

  describe('GET /api/v1/disciplines', () => {
    it('should return only disciplines of the user gym when no filter is provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/disciplines')
        .set(authHeader(ownerA))
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(disciplineA.id);
      assertNoForbiddenKeys(response.body[0]);
      expect(response.body[0]).not.toHaveProperty('gym');
      expect(response.body[0]).not.toHaveProperty('classes');
      expect(response.body[0]).not.toHaveProperty('deletedAt');
    });

    it('should not allow explicit gymId query to bypass tenant isolation', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/disciplines?gymId=${gymB.id}`)
        .set(authHeader(ownerA))
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should allow SUPER_ADMIN to list all disciplines', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/disciplines')
        .set(authHeader(superAdmin))
        .expect(HttpStatus.OK);

      const ids = response.body.map((d: Discipline) => d.id);
      expect(ids).toContain(disciplineA.id);
      expect(ids).toContain(disciplineB.id);
    });
  });

  describe('GET /api/v1/disciplines/:id', () => {
    it('should allow reading a discipline from the user gym', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/disciplines/${disciplineA.id}`)
        .set(authHeader(ownerA))
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(disciplineA.id);
      assertNoForbiddenKeys(response.body);
      expect(response.body).not.toHaveProperty('gym');
      expect(response.body).not.toHaveProperty('classes');
      expect(response.body).not.toHaveProperty('deletedAt');
    });

    it('should not allow Gym A to read Gym B disciplines', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/disciplines/${disciplineB.id}`)
        .set(authHeader(ownerA))
        .expect(HttpStatus.FORBIDDEN);

      await request(app.getHttpServer())
        .get(`/api/v1/disciplines/${disciplineB.id}`)
        .set(authHeader(studentA))
        .expect(HttpStatus.FORBIDDEN);

      await request(app.getHttpServer())
        .get(`/api/v1/disciplines/${disciplineB.id}`)
        .set(authHeader(teacherA))
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should allow SUPER_ADMIN to read any discipline', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/disciplines/${disciplineB.id}`)
        .set(authHeader(superAdmin))
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(disciplineB.id);
    });
  });

  describe('GET /api/v1/disciplines/gym/:gymId', () => {
    it('should allow reading disciplines of the user gym', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/disciplines/gym/${gymA.id}`)
        .set(authHeader(ownerA))
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(disciplineA.id);
      assertNoForbiddenKeys(response.body[0]);
      expect(response.body[0]).not.toHaveProperty('gym');
      expect(response.body[0]).not.toHaveProperty('classes');
      expect(response.body[0]).not.toHaveProperty('deletedAt');
    });

    it('should not allow Gym A to read Gym B disciplines by gymId', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/disciplines/gym/${gymB.id}`)
        .set(authHeader(ownerA))
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should allow SUPER_ADMIN to read disciplines of any gym', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/disciplines/gym/${gymB.id}`)
        .set(authHeader(superAdmin))
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(disciplineB.id);
    });
  });

  describe('PATCH /api/v1/disciplines/:id', () => {
    it('should allow OWNER_GYM to update their own discipline', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/disciplines/${disciplineA.id}`)
        .set(authHeader(ownerA))
        .send({ name: 'Yoga A Updated' })
        .expect(HttpStatus.OK);

      expect(response.body.name).toBe('Yoga A Updated');
      expect(response.body.gymId).toBe(gymA.id);
      assertNoForbiddenKeys(response.body);
      expect(response.body).not.toHaveProperty('deletedAt');

      disciplineA.name = 'Yoga A Updated';
    });

    it('should not allow Gym A to update Gym B disciplines', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/disciplines/${disciplineB.id}`)
        .set(authHeader(ownerA))
        .send({ name: 'Hacked' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should not allow OWNER_GYM to move a discipline to another gym', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/disciplines/${disciplineA.id}`)
        .set(authHeader(ownerA))
        .send({ gymId: gymB.id })
        .expect(HttpStatus.OK);

      expect(response.body.gymId).toBe(gymA.id);

      const discipline = await disciplineRepository.findOne({
        where: { id: disciplineA.id },
      });
      expect(discipline?.gymId).toBe(gymA.id);
    });

    it('should allow SUPER_ADMIN to update any discipline without transferring it', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/disciplines/${disciplineB.id}`)
        .set(authHeader(superAdmin))
        .send({ name: 'CrossFit B Updated' })
        .expect(HttpStatus.OK);

      expect(response.body.name).toBe('CrossFit B Updated');
      expect(response.body.gymId).toBe(gymB.id);

      disciplineB.name = 'CrossFit B Updated';
    });
  });
});
