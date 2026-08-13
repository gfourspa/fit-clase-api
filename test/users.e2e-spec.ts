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
import { InvitationStatus, Role } from './../src/common/enums';
import { Gym } from './../src/entities/gym.entity';
import { Invitation } from './../src/entities/invitation.entity';
import { User } from './../src/entities/user.entity';
import { FirebaseAuthGuard } from './../src/modules/auth/firebase-auth.guard';

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

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let gymRepository: Repository<Gym>;
  let userRepository: Repository<User>;
  let invitationRepository: Repository<Invitation>;

  let ownerA: User;
  let ownerB: User;
  let gymA: Gym;
  let gymB: Gym;
  let student: User;
  let teacher: User;
  let superAdmin: User;
  let pendingUser: User;

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
    invitationRepository = app.get(getRepositoryToken(Invitation));

    ownerA = createUser(Role.OWNER_GYM, null);
    ownerB = createUser(Role.OWNER_GYM, null);
    superAdmin = createUser(Role.SUPER_ADMIN, null);
    await userRepository.save([ownerA, ownerB, superAdmin]);

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
    await userRepository.save([ownerA, ownerB]);

    student = createUser(Role.STUDENT, gymA.id);
    teacher = createUser(Role.TEACHER, gymA.id);
    pendingUser = createUser(Role.STUDENT, null);
    await userRepository.save([student, teacher, pendingUser]);
  });

  afterAll(async () => {
    await invitationRepository.delete({ gymId: gymA.id });
    await invitationRepository.delete({ gymId: gymB.id });

    await userRepository.update(pendingUser.id, { gymId: null });
    await userRepository.update(student.id, { gymId: null });
    await userRepository.update(teacher.id, { gymId: null });
    await userRepository.update(ownerA.id, { gymId: null });
    await userRepository.update(ownerB.id, { gymId: null });

    await gymRepository.delete([gymA.id, gymB.id]);
    await userRepository.delete([
      student.id,
      teacher.id,
      pendingUser.id,
      ownerA.id,
      ownerB.id,
      superAdmin.id,
    ]);

    await app.close();
  });

  describe('POST /api/v1/users/:gymId/add-to-gym', () => {
    it('should allow OWNER_GYM to add users to their own gym', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/${gymA.id}/add-to-gym`)
        .set(authHeader(ownerA))
        .send({ emails: [pendingUser.email] })
        .expect(HttpStatus.OK);

      expect(response.body.added).toContain(pendingUser.email);

      const updatedUser = await userRepository.findOne({
        where: { id: pendingUser.id },
      });
      expect(updatedUser?.gymId).toBe(gymA.id);

      await userRepository.update(pendingUser.id, { gymId: null });
    });

    it('should allow SUPER_ADMIN to add users to any gym', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/${gymB.id}/add-to-gym`)
        .set(authHeader(superAdmin))
        .send({ emails: [pendingUser.email] })
        .expect(HttpStatus.OK);

      expect(response.body.added).toContain(pendingUser.email);

      const updatedUser = await userRepository.findOne({
        where: { id: pendingUser.id },
      });
      expect(updatedUser?.gymId).toBe(gymB.id);

      await userRepository.update(pendingUser.id, { gymId: null });
    });

    it('should reject STUDENT with 403', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/users/${gymA.id}/add-to-gym`)
        .set(authHeader(student))
        .send({ emails: [pendingUser.email] })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject TEACHER with 403', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/users/${gymA.id}/add-to-gym`)
        .set(authHeader(teacher))
        .send({ emails: [pendingUser.email] })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject OWNER_GYM trying to manage another gym', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/${gymB.id}/add-to-gym`)
        .set(authHeader(ownerA))
        .send({ emails: [pendingUser.email] })
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.body.message).toMatch(
        /No tienes permisos para este gimnasio/,
      );

      const updatedUser = await userRepository.findOne({
        where: { id: pendingUser.id },
      });
      expect(updatedUser?.gymId).toBeNull();
    });
  });

  describe('Invitations and auto-assign-student', () => {
    it('should allow OWNER_GYM to create an invitation for their gym', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(ownerA))
        .send({ gymId: gymA.id, email: pendingUser.email })
        .expect(HttpStatus.CREATED);

      expect(response.body.email).toBe(pendingUser.email);
      expect(response.body.gymId).toBe(gymA.id);
      expect(response.body.status).toBe(InvitationStatus.PENDING);

      await invitationRepository.delete(response.body.id);
    });

    it('should allow SUPER_ADMIN to create an invitation for any gym', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(superAdmin))
        .send({ gymId: gymB.id, email: pendingUser.email })
        .expect(HttpStatus.CREATED);

      expect(response.body.gymId).toBe(gymB.id);

      await invitationRepository.delete(response.body.id);
    });

    it('should reject STUDENT creating an invitation with 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(student))
        .send({ gymId: gymA.id, email: pendingUser.email })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject OWNER_GYM creating an invitation for another gym', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(ownerA))
        .send({ gymId: gymB.id, email: pendingUser.email })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should enroll a student via valid invitation token', async () => {
      const invitationResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(ownerA))
        .send({ gymId: gymA.id, email: pendingUser.email })
        .expect(HttpStatus.CREATED);

      const invitationToken = invitationResponse.body.id;

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/auto-assign-student')
        .set(authHeader(pendingUser))
        .send({ invitationToken })
        .expect(HttpStatus.OK);

      expect(response.body.role).toBe(Role.STUDENT);
      expect(response.body.gymId).toBe(gymA.id);

      const usedInvitation = await invitationRepository.findOne({
        where: { id: invitationToken },
      });
      expect(usedInvitation?.status).toBe(InvitationStatus.USED);
      expect(usedInvitation?.usedByUserId).toBe(pendingUser.id);

      await userRepository.update(pendingUser.id, { gymId: null });
      await invitationRepository.delete(invitationToken);
    });

    it('should reject auto-assign with wrong email', async () => {
      const invitationResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(ownerA))
        .send({ gymId: gymA.id, email: pendingUser.email })
        .expect(HttpStatus.CREATED);

      const invitationToken = invitationResponse.body.id;

      const wrongUser = createUser(Role.STUDENT, null);
      wrongUser.email = `${wrongUser.id}@other.com`;
      await userRepository.save(wrongUser);

      await request(app.getHttpServer())
        .post('/api/v1/users/auto-assign-student')
        .set(authHeader(wrongUser))
        .send({ invitationToken })
        .expect(HttpStatus.UNAUTHORIZED);

      await userRepository.delete(wrongUser.id);
      await invitationRepository.delete(invitationToken);
    });

    it('should reject auto-assign with already used invitation', async () => {
      const invitationResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(ownerA))
        .send({ gymId: gymA.id, email: pendingUser.email })
        .expect(HttpStatus.CREATED);

      const invitationToken = invitationResponse.body.id;

      await request(app.getHttpServer())
        .post('/api/v1/users/auto-assign-student')
        .set(authHeader(pendingUser))
        .send({ invitationToken })
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .post('/api/v1/users/auto-assign-student')
        .set(authHeader(pendingUser))
        .send({ invitationToken })
        .expect(HttpStatus.BAD_REQUEST);

      await userRepository.update(pendingUser.id, { gymId: null });
      await invitationRepository.delete(invitationToken);
    });

    it('should reject auto-assign with expired invitation', async () => {
      const invitationResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(ownerA))
        .send({ gymId: gymA.id, email: pendingUser.email, expiresInHours: 1 })
        .expect(HttpStatus.CREATED);

      const invitationToken = invitationResponse.body.id;

      // Forzar expiración editando directamente en base de datos
      const invitation = await invitationRepository.findOne({
        where: { id: invitationToken },
      });
      if (invitation) {
        invitation.expiresAt = new Date(Date.now() - 60 * 60 * 1000);
        await invitationRepository.save(invitation);
      }

      await request(app.getHttpServer())
        .post('/api/v1/users/auto-assign-student')
        .set(authHeader(pendingUser))
        .send({ invitationToken })
        .expect(HttpStatus.BAD_REQUEST);

      await invitationRepository.delete(invitationToken);
    });
  });
});
