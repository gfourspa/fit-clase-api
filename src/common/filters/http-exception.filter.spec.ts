import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let debugSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    const logger = (filter as any).logger;
    debugSpy = jest
      .spyOn(logger, 'debug')
      .mockImplementation(() => undefined);
    logSpy = jest.spyOn(logger, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    debugSpy.mockRestore();
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  function createHost(request: any, response: any) {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as any;
  }

  function createResponse() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
  }

  it('should strip query strings from logged path', () => {
    const exception = new BadRequestException('Invalid input');
    const request = {
      method: 'GET',
      url: '/api/v1/classes?token=secret&apiKey=123',
      headers: { authorization: 'Bearer secret-token' },
    } as any;

    filter.catch(exception, createHost(request, createResponse()));

    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = logSpy.mock.calls[0][0];
    expect(payload.path).toBe('/api/v1/classes');
    expect(payload.path).not.toContain('?');
    expect(JSON.stringify(payload)).not.toContain('token');
    expect(JSON.stringify(payload)).not.toContain('secret');
    expect(JSON.stringify(payload)).not.toContain('apiKey');
    expect(JSON.stringify(payload)).not.toContain('Bearer');
  });

  it('should not include request headers in logs', () => {
    const exception = new BadRequestException('Invalid input');
    const request = {
      method: 'GET',
      url: '/api/v1/users',
      headers: { authorization: 'Bearer secret-token', cookie: 'session=xyz' },
    } as any;

    filter.catch(exception, createHost(request, createResponse()));

    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = logSpy.mock.calls[0][0];
    const payloadJson = JSON.stringify(payload);
    expect(payloadJson).not.toContain('authorization');
    expect(payloadJson).not.toContain('Bearer');
    expect(payloadJson).not.toContain('cookie');
    expect(payloadJson).not.toContain('session');
  });

  it('should log 404 public unknown routes as debug', () => {
    const exception = new NotFoundException('Cannot GET /wp-admin');
    const request = {
      method: 'GET',
      url: '/wp-admin',
      headers: {},
    } as any;

    filter.catch(exception, createHost(request, createResponse()));

    expect(debugSpy).toHaveBeenCalledTimes(1);
    const payload = debugSpy.mock.calls[0][0];
    expect(payload.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(payload.path).toBe('/wp-admin');
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should log 404 API routes as info', () => {
    const exception = new NotFoundException('Cannot GET /api/v1/non-existing');
    const request = {
      method: 'GET',
      url: '/api/v1/non-existing',
      headers: {},
    } as any;

    filter.catch(exception, createHost(request, createResponse()));

    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = logSpy.mock.calls[0][0];
    expect(payload.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(payload.path).toBe('/api/v1/non-existing');
    expect(debugSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should log 400 as info', () => {
    const exception = new BadRequestException('Invalid input');
    const request = { method: 'POST', url: '/api/v1/classes', headers: {} } as any;

    filter.catch(exception, createHost(request, createResponse()));

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0].statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should log 401 as info', () => {
    const exception = new UnauthorizedException('Unauthorized');
    const request = { method: 'GET', url: '/api/v1/users/me', headers: {} } as any;

    filter.catch(exception, createHost(request, createResponse()));

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0].statusCode).toBe(HttpStatus.UNAUTHORIZED);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should log 403 as warn', () => {
    const exception = new ForbiddenException('Forbidden');
    const request = { method: 'GET', url: '/api/v1/users', headers: {} } as any;

    filter.catch(exception, createHost(request, createResponse()));

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0].statusCode).toBe(HttpStatus.FORBIDDEN);
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should log 429 as warn', () => {
    const exception = new HttpException(
      'Too Many Requests',
      HttpStatus.TOO_MANY_REQUESTS,
    );
    const request = { method: 'GET', url: '/api/v1/classes', headers: {} } as any;

    filter.catch(exception, createHost(request, createResponse()));

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0].statusCode).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should log 500 as error with stack', () => {
    const exception = new Error('Unexpected failure');
    const request = { method: 'GET', url: '/api/v1/classes', headers: {} } as any;

    filter.catch(exception, createHost(request, createResponse()));

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [payload, stack] = errorSpy.mock.calls[0];
    expect(payload.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(payload.path).toBe('/api/v1/classes');
    expect(stack).toContain('Unexpected failure');
    expect(debugSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should keep the same HTTP response shape and status code', () => {
    const exception = new NotFoundException('Cannot GET /wp-admin');
    const response = createResponse();
    const request = { method: 'GET', url: '/wp-admin', headers: {} } as any;

    filter.catch(exception, createHost(request, response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        path: '/wp-admin',
        message: 'Cannot GET /wp-admin',
      }),
    );
  });

  it('should include sanitized user-agent when present', () => {
    const exception = new NotFoundException('Cannot GET /wp-admin');
    const longUserAgent = 'a'.repeat(250);
    const request = {
      method: 'GET',
      url: '/wp-admin',
      headers: { 'user-agent': longUserAgent },
    } as any;

    filter.catch(exception, createHost(request, createResponse()));

    expect(debugSpy).toHaveBeenCalledTimes(1);
    const payload = debugSpy.mock.calls[0][0];
    expect(payload.userAgent).toHaveLength(203);
    expect(payload.userAgent).toMatch(/^a{200}\.\.\.$/);
  });
});
