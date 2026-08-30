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
import { assertNoForbiddenKeys } from './helpers/response-boundary';

jest.setTimeout(30000);

@Injectable()
class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const userHeader = req.headers['x-test-user'];
    req.user = userHeader
      ? (() => {
          const user = JSON.parse(userHeader);
          return {
            ...user,
            firebaseEmail: user.email,
            emailVerified: true,
          };
        })()
      : {
          uid: 'default-uid',
          id: 'default-user',
          email: 'default@test.com',
          firebaseEmail: 'default@test.com',
          emailVerified: true,
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
      assertNoForbiddenKeys(response.body);

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
      assertNoForbiddenKeys(response.body);

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
      expect(response.body.id).toEqual(expect.any(String));
      expect(response.body.invitationToken).toEqual(expect.any(String));
      expect(response.body.invitationToken).not.toBe(response.body.id);
      expect(response.body.emailSent).toBe(false);
      expect(response.body.expiresAt).toEqual(expect.any(String));
      expect(response.body).not.toHaveProperty('tokenHash');
      expect(response.body).not.toHaveProperty('usedByUserId');
      expect(response.body).not.toHaveProperty('owner');
      expect(response.body).not.toHaveProperty('users');
      assertNoForbiddenKeys(response.body);

      await invitationRepository.delete(response.body.id);
    });

    it('should allow SUPER_ADMIN to create an invitation for any gym', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(superAdmin))
        .send({ gymId: gymB.id, email: pendingUser.email })
        .expect(HttpStatus.CREATED);

      expect(response.body.gymId).toBe(gymB.id);
      expect(response.body.id).toEqual(expect.any(String));
      expect(response.body).not.toHaveProperty('usedByUserId');
      assertNoForbiddenKeys(response.body);

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
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject duplicate pending invitations', async () => {
      const invitationResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(ownerA))
        .send({ gymId: gymA.id, email: pendingUser.email })
        .expect(HttpStatus.CREATED);

      await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(ownerA))
        .send({ gymId: gymA.id, email: pendingUser.email })
        .expect(HttpStatus.CONFLICT);

      await invitationRepository.delete(invitationResponse.body.id);
    });

    it('should cancel a pending invitation and reject its token', async () => {
      const invitationResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(ownerA))
        .send({ gymId: gymA.id, email: pendingUser.email })
        .expect(HttpStatus.CREATED);

      await request(app.getHttpServer())
        .post(`/api/v1/invitations/${invitationResponse.body.id}/cancel`)
        .set(authHeader(ownerA))
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set(authHeader(pendingUser))
        .send({ invitationToken: invitationResponse.body.invitationToken })
        .expect(HttpStatus.BAD_REQUEST);

      await invitationRepository.delete(invitationResponse.body.id);
    });

    it('should not demote privileged users accepting student invitations', async () => {
      const invitationResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(superAdmin))
        .send({ gymId: gymA.id, email: teacher.email })
        .expect(HttpStatus.CREATED);

      await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set(authHeader(teacher))
        .send({ invitationToken: invitationResponse.body.invitationToken })
        .expect(HttpStatus.CONFLICT);

      const unchangedTeacher = await userRepository.findOne({
        where: { id: teacher.id },
      });
      expect(unchangedTeacher?.role).toBe(Role.TEACHER);
      expect(unchangedTeacher?.gymId).toBe(gymA.id);

      await invitationRepository.delete(invitationResponse.body.id);
    });

    it('should enroll a student via valid invitation token', async () => {
      const invitationResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(ownerA))
        .send({ gymId: gymA.id, email: pendingUser.email })
        .expect(HttpStatus.CREATED);

      const invitationToken = invitationResponse.body.invitationToken;
      expect(invitationToken).toEqual(expect.any(String));

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/auto-assign-student')
        .set(authHeader(pendingUser))
        .send({ invitationToken })
        .expect(HttpStatus.OK);

      expect(response.body.role).toBe(Role.STUDENT);
      expect(response.body.gymId).toBe(gymA.id);
      assertNoForbiddenKeys(response.body);

      const usedInvitation = await invitationRepository.findOne({
        where: { id: invitationResponse.body.id },
      });
      expect(usedInvitation?.status).toBe(InvitationStatus.USED);
      expect(usedInvitation?.usedByUserId).toBe(pendingUser.id);

      await userRepository.update(pendingUser.id, { gymId: null });
      await invitationRepository.delete(invitationResponse.body.id);
    });

    it('returns an explicit safe response for user synchronization', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users/sync')
        .set(authHeader(ownerA))
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: ownerA.id,
        email: ownerA.email,
        name: ownerA.name,
        role: ownerA.role,
        gymId: ownerA.gymId,
      });
      assertNoForbiddenKeys(response.body);
      expect(response.body).not.toHaveProperty('gym');
      expect(response.body).not.toHaveProperty('reservations');
    });

    it('returns safe administrative users without entity internals', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set(authHeader(superAdmin))
        .expect(HttpStatus.OK);

      expect(response.body.length).toBeGreaterThan(0);
      response.body.forEach((user: Record<string, unknown>) => {
        assertNoForbiddenKeys(user);
        expect(user).not.toHaveProperty('gym');
        expect(user).not.toHaveProperty('reservations');
        expect(user).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            email: expect.any(String),
            role: expect.any(String),
          }),
        );
      });
    });

    it('should reject auto-assign with wrong email', async () => {
      const invitationResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(ownerA))
        .send({ gymId: gymA.id, email: pendingUser.email })
        .expect(HttpStatus.CREATED);

      const invitationToken = invitationResponse.body.invitationToken;

      const wrongUser = createUser(Role.STUDENT, null);
      wrongUser.email = `${wrongUser.id}@other.com`;
      await userRepository.save(wrongUser);

      await request(app.getHttpServer())
        .post('/api/v1/users/auto-assign-student')
        .set(authHeader(wrongUser))
        .send({ invitationToken })
        .expect(HttpStatus.UNAUTHORIZED);

      await userRepository.delete(wrongUser.id);
      await invitationRepository.delete(invitationResponse.body.id);
    });

    it('should accept an already used invitation idempotently', async () => {
      const invitationResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(ownerA))
        .send({ gymId: gymA.id, email: pendingUser.email })
        .expect(HttpStatus.CREATED);

      const invitationToken = invitationResponse.body.invitationToken;

      await request(app.getHttpServer())
        .post('/api/v1/users/auto-assign-student')
        .set(authHeader(pendingUser))
        .send({ invitationToken })
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .post('/api/v1/users/auto-assign-student')
        .set(authHeader(pendingUser))
        .send({ invitationToken })
        .expect(HttpStatus.OK);

      await userRepository.update(pendingUser.id, { gymId: null });
      await invitationRepository.delete(invitationResponse.body.id);
    });

    it('should reject auto-assign with expired invitation', async () => {
      const invitationResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(ownerA))
        .send({ gymId: gymA.id, email: pendingUser.email, expiresInHours: 1 })
        .expect(HttpStatus.CREATED);

      const invitationToken = invitationResponse.body.invitationToken;

      // Forzar expiración editando directamente en base de datos
      const invitation = await invitationRepository.findOne({
        where: { id: invitationResponse.body.id },
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

      await invitationRepository.delete(invitationResponse.body.id);
    });
  });
});
