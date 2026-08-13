import { BadRequestException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    warnSpy = jest
      .spyOn((filter as any).logger, 'warn')
      .mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn((filter as any).logger, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
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

  it('should strip query strings from logged path', () => {
    const exception = new BadRequestException('Invalid input');
    const request = {
      url: '/api/v1/classes?token=secret&apiKey=123',
      headers: { authorization: 'Bearer secret-token' },
    } as any;
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    filter.catch(exception, createHost(request, response));

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const logLine = warnSpy.mock.calls[0][0];
    expect(logLine).toContain('/api/v1/classes');
    expect(logLine).not.toContain('?');
    expect(logLine).not.toContain('token');
    expect(logLine).not.toContain('secret');
    expect(logLine).not.toContain('apiKey');
    expect(logLine).not.toContain('Bearer');
  });

  it('should not include request headers in logs', () => {
    const exception = new BadRequestException('Invalid input');
    const request = {
      url: '/api/v1/users',
      headers: { authorization: 'Bearer secret-token', cookie: 'session=xyz' },
    } as any;
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    filter.catch(exception, createHost(request, response));

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const logLine = warnSpy.mock.calls[0][0] as string;
    expect(logLine).not.toContain('authorization');
    expect(logLine).not.toContain('Bearer');
    expect(logLine).not.toContain('cookie');
    expect(logLine).not.toContain('session');
  });
});
