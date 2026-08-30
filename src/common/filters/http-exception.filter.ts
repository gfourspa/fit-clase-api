import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  success: false;
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
}

interface ExceptionLogPayload {
  statusCode: number;
  method: string;
  path: string;
  message: string;
  userAgent?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const statusCode: number = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.extractMessage(exception, isHttp);
    // Nunca registrar query strings en logs de errores.
    const path = request.url.split('?')[0];
    const timestamp = new Date().toISOString();

    this.logException(request, statusCode, path, message, exception);

    const body: ErrorResponse = {
      success: false,
      statusCode,
      timestamp,
      path,
      message,
    };

    response.status(statusCode).json(body);
  }

  private logException(
    request: Request,
    statusCode: number,
    path: string,
    message: string | string[],
    exception: unknown,
  ): void {
    const payload: ExceptionLogPayload = {
      statusCode,
      method: request.method ?? 'UNKNOWN',
      path,
      message: String(message),
    };

    const userAgent = this.sanitizeUserAgent(
      request.headers?.['user-agent'] as string | undefined,
    );
    if (userAgent) {
      payload.userAgent = userAgent;
    }

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(payload, stack);
      return;
    }

    if (statusCode === HttpStatus.FORBIDDEN || statusCode === 429) {
      this.logger.warn(payload);
      return;
    }

    if (statusCode === HttpStatus.NOT_FOUND && !path.startsWith('/api/v1/')) {
      // Rutas públicas desconocidas (scanners/bots): reducir ruido.
      this.logger.debug(payload);
      return;
    }

    this.logger.log(payload);
  }

  private sanitizeUserAgent(
    userAgent: string | undefined,
    maxLength = 200,
  ): string | undefined {
    if (!userAgent || typeof userAgent !== 'string') {
      return undefined;
    }
    const trimmed = userAgent.trim();
    return trimmed.length > maxLength
      ? `${trimmed.slice(0, maxLength)}...`
      : trimmed;
  }

  private extractMessage(
    exception: unknown,
    isHttp: boolean,
  ): string | string[] {
    if (!isHttp) {
      return 'Internal server error';
    }

    const httpException = exception as HttpException;
    const res = httpException.getResponse();

    if (typeof res === 'string') {
      return res;
    }

    if (typeof res === 'object' && res !== null) {
      const resObj = res as Record<string, unknown>;
      const msg = resObj['message'];
      if (typeof msg === 'string' || Array.isArray(msg)) {
        return msg as string | string[];
      }
    }

    return httpException.message;
  }
}
