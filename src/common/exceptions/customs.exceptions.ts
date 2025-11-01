import {
    HttpException,
    HttpStatus,
} from '@nestjs/common';

export class CustomException extends HttpException {
    constructor(message: string, status: HttpStatus) {
        super(message, status);
    }

    static NotFound(message: string) {
        return new CustomException(message, HttpStatus.NOT_FOUND);
    }

    static BadRequest(message: string) {
        return new CustomException(message, HttpStatus.BAD_REQUEST);
    }

    static Unauthorized(message: string) {
        return new CustomException(message, HttpStatus.UNAUTHORIZED);
    }

    static BadRequestForbidden(message: string) {
        return new CustomException(message, HttpStatus.FORBIDDEN);
    }

    static InternalServerError(message: string) {
        return new CustomException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    static Conflict(message: string) {
        return new CustomException(message, HttpStatus.CONFLICT);
    }
}