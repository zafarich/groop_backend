import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ERROR_MESSAGES } from '../constants/error-codes';

/**
 * Base class for custom exceptions with error codes
 */
export class CodedHttpException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    message?: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(message || ERROR_MESSAGES[errorCode], status);
  }

  getErrorCode(): ErrorCode {
    return this.errorCode;
  }
}

/**
 * Authentication & Authorization Exceptions
 */
export class InvalidCredentialsException extends CodedHttpException {
  constructor(message?: string) {
    super(ErrorCode.INVALID_CREDENTIALS, message, HttpStatus.UNAUTHORIZED);
  }
}

export class InvalidSmsCodeException extends CodedHttpException {
  constructor(message?: string) {
    super(ErrorCode.INVALID_SMS_CODE, message, HttpStatus.BAD_REQUEST);
  }
}

export class ExpiredSmsCodeException extends CodedHttpException {
  constructor(message?: string) {
    super(ErrorCode.EXPIRED_SMS_CODE, message, HttpStatus.BAD_REQUEST);
  }
}

export class InvalidTokenException extends CodedHttpException {
  constructor(message?: string) {
    super(ErrorCode.INVALID_TOKEN, message, HttpStatus.UNAUTHORIZED);
  }
}

export class ExpiredTokenException extends CodedHttpException {
  constructor(message?: string) {
    super(ErrorCode.EXPIRED_TOKEN, message, HttpStatus.UNAUTHORIZED);
  }
}

export class AccountDeactivatedException extends CodedHttpException {
  constructor(message?: string) {
    super(ErrorCode.ACCOUNT_DEACTIVATED, message, HttpStatus.FORBIDDEN);
  }
}

export class TelegramAccountNoPasswordException extends CodedHttpException {
  constructor(message?: string) {
    super(
      ErrorCode.TELEGRAM_ACCOUNT_NO_PASSWORD,
      message,
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Resource Not Found Exceptions
 */
export class VerificationSessionNotFoundException extends CodedHttpException {
  constructor(message?: string) {
    super(
      ErrorCode.VERIFICATION_SESSION_NOT_FOUND,
      message,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class UserNotFoundException extends CodedHttpException {
  constructor(message?: string) {
    super(ErrorCode.USER_NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}

export class CenterNotFoundException extends CodedHttpException {
  constructor(message?: string) {
    super(ErrorCode.CENTER_NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}

export class RoleNotFoundException extends CodedHttpException {
  constructor(message?: string) {
    super(ErrorCode.ROLE_NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}

/**
 * Conflict Exceptions
 */
export class UserAlreadyExistsException extends CodedHttpException {
  constructor(message?: string) {
    super(ErrorCode.USER_ALREADY_EXISTS, message, HttpStatus.CONFLICT);
  }
}

export class PhoneNumberAlreadyExistsException extends CodedHttpException {
  constructor(message?: string) {
    super(ErrorCode.PHONE_NUMBER_ALREADY_EXISTS, message, HttpStatus.CONFLICT);
  }
}

/**
 * Business Logic Exceptions
 */
export class SmsSendFailedException extends CodedHttpException {
  constructor(message?: string) {
    super(ErrorCode.SMS_SEND_FAILED, message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class MaxAttemptsExceededException extends CodedHttpException {
  constructor(message?: string) {
    super(
      ErrorCode.MAX_ATTEMPTS_EXCEEDED,
      message,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class SmsRateLimitExceededException extends CodedHttpException {
  constructor(message?: string) {
    super(
      ErrorCode.SMS_RATE_LIMIT_EXCEEDED,
      message,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
