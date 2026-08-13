import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject requests without an Authorization header', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/classes')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('should reject requests with a malformed Authorization header', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/classes')
      .set('Authorization', 'malformed')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('should reject requests with an invalid Firebase token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/classes')
      .set('Authorization', 'Bearer invalid-token')
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
