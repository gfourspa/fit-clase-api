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

describe('Invitations Accept Flow (e2e)', () => {
  let app: INestApplication;
  let gymRepository: Repository<Gym>;
  let userRepository: Repository<User>;
  let invitationRepository: Repository<Invitation>;

  let owner: User;
  let superAdmin: User;
  let student: User;
  let pendingUser: User;
  let gym: Gym;
  let invitationToken: string;
  let invitationId: string;

  const TEST_ACCEPT_URL = 'https://api.example.com/api/v1/invitations/accept';

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
    process.env.INVITATION_ACCEPT_URL = TEST_ACCEPT_URL;

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
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    gymRepository = app.get(getRepositoryToken(Gym));
    userRepository = app.get(getRepositoryToken(User));
    invitationRepository = app.get(getRepositoryToken(Invitation));

    owner = createUser(Role.OWNER_GYM, null);
    superAdmin = createUser(Role.SUPER_ADMIN, null);
    await userRepository.save([owner, superAdmin]);

    gym = new Gym();
    gym.id = uuidv4();
    gym.name = 'Accept Flow Gym';
    gym.address = 'Address';
    gym.contact = 'contact';
    gym.ownerId = owner.id;
    await gymRepository.save(gym);

    owner.gymId = gym.id;
    await userRepository.save(owner);

    student = createUser(Role.STUDENT, gym.id);
    pendingUser = createUser(Role.STUDENT, null);
    await userRepository.save([student, pendingUser]);
  });

  afterAll(async () => {
    await invitationRepository.delete({ gymId: gym.id });
    await userRepository.update([student.id, pendingUser.id, owner.id], {
      gymId: null,
    });
    await gymRepository.delete(gym.id);
    await userRepository.delete([student.id, pendingUser.id, owner.id, superAdmin.id]);
    delete process.env.INVITATION_ACCEPT_URL;
    await app.close();
  });

  describe('POST /api/v1/invitations', () => {
    it('should create an invitation and generate a valid acceptance URL', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(owner))
        .send({ gymId: gym.id, email: pendingUser.email })
        .expect(HttpStatus.CREATED);

      expect(response.body.email).toBe(pendingUser.email);
      expect(response.body.gymId).toBe(gym.id);
      expect(response.body.status).toBe(InvitationStatus.PENDING);
      expect(response.body.invitationToken).toEqual(expect.any(String));
      expect(response.body.acceptanceUrl).toEqual(expect.any(String));
      expect(response.body.acceptanceUrl).toContain(TEST_ACCEPT_URL);
      expect(response.body.acceptanceUrl).toContain('?token=');
      expect(response.body.acceptanceUrl).toContain(
        encodeURIComponent(response.body.invitationToken),
      );
      assertNoForbiddenKeys(response.body);

      invitationToken = response.body.invitationToken;
      invitationId = response.body.id;
    });
  });

  describe('GET /api/v1/invitations/accept', () => {
    it('should validate a valid token without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/invitations/accept')
        .query({ token: invitationToken })
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        id: invitationId,
        gymId: gym.id,
        email: pendingUser.email,
        status: InvitationStatus.PENDING,
      });
      expect(response.body).toHaveProperty('expiresAt');
      assertNoForbiddenKeys(response.body);
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/invitations/accept')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/invitations/accept')
        .query({ token: 'thisisaninvalidtoken12345' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject malformed token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/invitations/accept')
        .query({ token: 'token with spaces!' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /api/v1/invitations/accept', () => {
    it('should accept invitation using token field', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set(authHeader(pendingUser))
        .send({ token: invitationToken })
        .expect(HttpStatus.OK);

      expect(response.body.role).toBe(Role.STUDENT);
      expect(response.body.gymId).toBe(gym.id);
      expect(response.body.idempotent).toBe(false);
      assertNoForbiddenKeys(response.body);

      const usedInvitation = await invitationRepository.findOne({
        where: { id: invitationId },
      });
      expect(usedInvitation?.status).toBe(InvitationStatus.USED);
      expect(usedInvitation?.usedByUserId).toBe(pendingUser.id);
    });

    it('should remain idempotent on duplicate acceptance with token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set(authHeader(pendingUser))
        .send({ token: invitationToken })
        .expect(HttpStatus.OK);

      expect(response.body.idempotent).toBe(true);
      expect(response.body.role).toBe(Role.STUDENT);
      expect(response.body.gymId).toBe(gym.id);
    });

    it('should still accept invitationToken (legacy field)', async () => {
      const newPendingUser = createUser(Role.STUDENT, null);
      await userRepository.save(newPendingUser);

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(owner))
        .send({ gymId: gym.id, email: newPendingUser.email })
        .expect(HttpStatus.CREATED);

      const legacyToken = createResponse.body.invitationToken;

      const response = await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set(authHeader(newPendingUser))
        .send({ invitationToken: legacyToken })
        .expect(HttpStatus.OK);

      expect(response.body.role).toBe(Role.STUDENT);
      expect(response.body.gymId).toBe(gym.id);

      await invitationRepository.delete(createResponse.body.id);
      await userRepository.delete(newPendingUser.id);
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set(authHeader(pendingUser))
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set(authHeader(pendingUser))
        .send({ token: 'thisisaninvalidtoken12345' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject token from wrong email', async () => {
      const wrongUser = createUser(Role.STUDENT, null);
      wrongUser.email = `${wrongUser.id}@other.com`;
      await userRepository.save(wrongUser);

      await request(app.getHttpServer())
        .post('/api/v1/invitations/accept')
        .set(authHeader(wrongUser))
        .send({ token: invitationToken })
        .expect(HttpStatus.UNAUTHORIZED);

      await userRepository.delete(wrongUser.id);
    });
  });

  describe('GET /api/v1/invitations/accept after usage', () => {
    it('should reject already used token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/invitations/accept')
        .query({ token: invitationToken })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Expired invitation validation', () => {
    it('should reject expired token on GET', async () => {
      const expiredUser = createUser(Role.STUDENT, null);
      await userRepository.save(expiredUser);

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/invitations')
        .set(authHeader(owner))
        .send({ gymId: gym.id, email: expiredUser.email, expiresInHours: 1 })
        .expect(HttpStatus.CREATED);

      const expiredToken = createResponse.body.invitationToken;

      const invitation = await invitationRepository.findOne({
        where: { id: createResponse.body.id },
      });
      if (invitation) {
        invitation.expiresAt = new Date(Date.now() - 60 * 60 * 1000);
        await invitationRepository.save(invitation);
      }

      await request(app.getHttpServer())
        .get('/api/v1/invitations/accept')
        .query({ token: expiredToken })
        .expect(HttpStatus.BAD_REQUEST);

      await invitationRepository.delete(createResponse.body.id);
      await userRepository.delete(expiredUser.id);
    });
  });
});
