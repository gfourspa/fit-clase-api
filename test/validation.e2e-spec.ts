import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  INestApplication,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { json, urlencoded } from 'express';
import { AppModule } from './../src/app.module';
import { Role } from './../src/common/enums';
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
          role: Role.SUPER_ADMIN,
          gymId: null,
        };
    return true;
  }
}

describe('Input validation and resource consumption (e2e)', () => {
  let app: INestApplication;
  const superAdminHeader = {
    'x-test-user': JSON.stringify({
      uid: 'super-admin-uid',
      id: 'super-admin-id',
      email: 'superadmin@test.com',
      role: Role.SUPER_ADMIN,
      gymId: null,
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useClass(TestAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.setGlobalPrefix('api/v1');

    // Limitar cuerpos de petición para poder probar el rechazo de payloads grandes
    app.use(json({ limit: '1kb' }));
    app.use(urlencoded({ extended: true, limit: '1kb' }));

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('UUID route parameters', () => {
    it('should reject invalid UUID in route parameter', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/classes/not-a-uuid')
        .set(superAdminHeader)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Pagination query parameters', () => {
    it('should reject negative page', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/classes?page=-1')
        .set(superAdminHeader)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject limit greater than 100', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/classes?limit=101')
        .set(superAdminHeader)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('String length limits', () => {
    it('should reject oversized gym name (MaxLength)', async () => {
      const oversizedName = 'a'.repeat(256);

      await request(app.getHttpServer())
        .post('/api/v1/gyms')
        .set(superAdminHeader)
        .send({
          name: oversizedName,
          address: 'Valid address',
          contact: '1234567890',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject oversized gym contact (MaxLength)', async () => {
      const oversizedContact = 'a'.repeat(101);

      await request(app.getHttpServer())
        .post('/api/v1/gyms')
        .set(superAdminHeader)
        .send({
          name: 'Valid Gym',
          address: 'Valid address',
          contact: oversizedContact,
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Mass assignment protection', () => {
    it('should reject unexpected ownerId on gym creation', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/gyms')
        .set(superAdminHeader)
        .send({
          name: 'Valid Gym',
          address: 'Valid address',
          contact: '1234567890',
          ownerId: '123e4567-e89b-12d3-a456-426614174000',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject unexpected id on discipline creation', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/disciplines')
        .set(superAdminHeader)
        .send({
          name: 'Yoga',
          gymId: '123e4567-e89b-12d3-a456-426614174000',
          id: '123e4567-e89b-12d3-a456-426614174001',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject unexpected createdAt on class creation', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set(superAdminHeader)
        .send({
          gymId: '123e4567-e89b-12d3-a456-426614174000',
          disciplineId: '123e4567-e89b-12d3-a456-426614174001',
          teacherId: '123e4567-e89b-12d3-a456-426614174002',
          date: '2030-01-01',
          startTime: '09:00',
          endTime: '10:00',
          capacity: 10,
          createdAt: '2030-01-01T00:00:00Z',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject invalid enum value for role assignment', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/assign-role')
        .set(superAdminHeader)
        .send({
          uid: 'some-firebase-uid',
          role: 'HACKER',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Malformed values', () => {
    it('should reject malformed date on class creation', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/classes')
        .set(superAdminHeader)
        .send({
          gymId: '123e4567-e89b-12d3-a456-426614174000',
          disciplineId: '123e4567-e89b-12d3-a456-426614174001',
          teacherId: '123e4567-e89b-12d3-a456-426614174002',
          date: 'not-a-date',
          startTime: '09:00',
          endTime: '10:00',
          capacity: 10,
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject invalid UUID in request body', async () => {
      const studentHeader = {
        'x-test-user': JSON.stringify({
          uid: 'student-uid',
          id: '123e4567-e89b-12d3-a456-426614174003',
          email: 'student@test.com',
          role: Role.STUDENT,
          gymId: '123e4567-e89b-12d3-a456-426614174000',
        }),
      };

      await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set(studentHeader)
        .send({ classId: 'not-a-uuid' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Request body size limits', () => {
    it('should reject oversized request body', async () => {
      const hugeAddress = 'a'.repeat(2048);

      await request(app.getHttpServer())
        .post('/api/v1/gyms')
        .set(superAdminHeader)
        .send({
          name: 'Valid Gym',
          address: hugeAddress,
          contact: '1234567890',
        })
        .expect(HttpStatus.PAYLOAD_TOO_LARGE);
    });
  });
});
