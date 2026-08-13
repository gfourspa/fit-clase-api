import { LoggerMiddleware } from './logger.middleware';

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new LoggerMiddleware();
    loggerSpy = jest
      .spyOn((middleware as any).logger, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  it('should log method, path, status code and duration', () => {
    const req = {
      method: 'GET',
      originalUrl: '/api/v1/classes',
    } as any;

    const callbacks: Record<string, () => void> = {};
    const res = {
      statusCode: 200,
      on: jest.fn((event: string, cb: () => void) => {
        callbacks[event] = cb;
        return res;
      }),
    } as any;

    const next = jest.fn();

    middleware.use(req, res, next);
    callbacks['finish']();

    expect(loggerSpy).toHaveBeenCalledTimes(1);
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringMatching(/GET \/api\/v1\/classes 200 — \d+ms/),
    );
    expect(next).toHaveBeenCalled();
  });

  it('should strip query strings from logged URL', () => {
    const req = {
      method: 'GET',
      originalUrl: '/api/v1/classes?password=secret&token=abc123',
    } as any;

    const callbacks: Record<string, () => void> = {};
    const res = {
      statusCode: 200,
      on: jest.fn((event: string, cb: () => void) => {
        callbacks[event] = cb;
        return res;
      }),
    } as any;

    middleware.use(req, res, jest.fn());
    callbacks['finish']();

    const logLine = loggerSpy.mock.calls[0][0];
    expect(logLine).toContain('/api/v1/classes');
    expect(logLine).not.toContain('?');
    expect(logLine).not.toContain('password');
    expect(logLine).not.toContain('secret');
    expect(logLine).not.toContain('token');
    expect(logLine).not.toContain('abc123');
  });
});
