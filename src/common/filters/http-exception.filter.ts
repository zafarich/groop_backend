import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from '../interfaces/api-response.interface';
import { ErrorCode, ERROR_MESSAGES } from '../constants/error-codes';
import { CodedHttpException } from '../exceptions/custom-exceptions';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
    let message = ERROR_MESSAGES[ErrorCode.INTERNAL_SERVER_ERROR];

    // Handle custom exceptions with error codes
    if (exception instanceof CodedHttpException) {
      status = exception.getStatus();
      errorCode = exception.getErrorCode();
      message = exception.message;
    }
    // Handle standard NestJS HttpExceptions
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Map HTTP status codes to error codes
      errorCode = this.mapHttpStatusToErrorCode(status);

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };

        // Handle validation errors
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join(', ');
          errorCode = ErrorCode.VALIDATION_ERROR;
        } else {
          message = responseObj.message || message;
        }
      }
    }
    // Handle generic errors
    else if (exception instanceof Error) {
      message = exception.message;
      errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - Error Code: ${errorCode}`,
      exception instanceof Error ? exception.stack : exception,
    );

    // Return standardized error response
    const errorResponse: ErrorResponse = {
      success: false,
      code: errorCode,
      data: null,
      message,
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Map HTTP status codes to custom error codes
   */
  private mapHttpStatusToErrorCode(status: HttpStatus): ErrorCode {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.RESOURCE_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.RESOURCE_ALREADY_EXISTS;
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.INVALID_INPUT;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ErrorCode.INTERNAL_SERVER_ERROR;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }
}
