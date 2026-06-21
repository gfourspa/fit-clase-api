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
    const path = request.url;
    const timestamp = new Date().toISOString();

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`[${statusCode}] ${path} — ${String(message)}`, stack);
    } else {
      this.logger.warn(`[${statusCode}] ${path} — ${String(message)}`);
    }

    const body: ErrorResponse = {
      success: false,
      statusCode,
      timestamp,
      path,
      message,
    };

    response.status(statusCode).json(body);
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
