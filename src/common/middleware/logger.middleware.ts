import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method } = req;
    // Nunca registrar query strings: pueden contener tokens o datos sensibles.
    const path = req.originalUrl.split('?')[0];
    const start = Date.now();

    // Health checks and keep-alive connections may reuse response objects;
    // remove the listener after the first finish event and avoid the warning.
    res.once('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      const logLine = `${method} ${path} ${statusCode} — ${duration}ms`;

      if (statusCode >= 500) {
        this.logger.error(logLine);
      } else if (statusCode >= 400) {
        this.logger.warn(logLine);
      } else {
        this.logger.log(logLine);
      }
    });

    next();
  }
}
