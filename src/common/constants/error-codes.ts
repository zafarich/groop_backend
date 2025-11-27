/**
 * Error Code Constants
 * Custom error codes for different error scenarios
 *
 * Code ranges:
 * 1000-1099: Authentication & Authorization errors
 * 1100-1199: Validation errors
 * 1200-1299: Resource not found errors
 * 1300-1399: Conflict errors
 * 1400-1499: Business logic errors
 * 9000-9999: System errors
 */

export enum ErrorCode {
  // Success
  SUCCESS = 0,

  // Authentication & Authorization (1000-1099)
  INVALID_CREDENTIALS = 1001,
  INVALID_SMS_CODE = 1002,
  EXPIRED_SMS_CODE = 1003,
  INVALID_TOKEN = 1004,
  EXPIRED_TOKEN = 1005,
  UNAUTHORIZED = 1006,
  FORBIDDEN = 1007,
  ACCOUNT_DEACTIVATED = 1008,
  TELEGRAM_ACCOUNT_NO_PASSWORD = 1009,

  // Validation Errors (1100-1199)
  VALIDATION_ERROR = 1100,
  INVALID_INPUT = 1101,
  MISSING_REQUIRED_FIELD = 1102,

  // Resource Not Found (1200-1299)
  RESOURCE_NOT_FOUND = 1200,
  USER_NOT_FOUND = 1201,
  CENTER_NOT_FOUND = 1202,
  ROLE_NOT_FOUND = 1203,
  PERMISSION_NOT_FOUND = 1204,
  VERIFICATION_SESSION_NOT_FOUND = 1205,

  // Conflict Errors (1300-1399)
  RESOURCE_ALREADY_EXISTS = 1300,
  USER_ALREADY_EXISTS = 1301,
  PHONE_NUMBER_ALREADY_EXISTS = 1302,
  USERNAME_ALREADY_EXISTS = 1303,

  // Business Logic Errors (1400-1499)
  SMS_SEND_FAILED = 1400,
  MAX_ATTEMPTS_EXCEEDED = 1401,
  OPERATION_NOT_ALLOWED = 1402,
  SMS_RATE_LIMIT_EXCEEDED = 1403,

  // System Errors (9000-9999)
  INTERNAL_SERVER_ERROR = 9000,
  DATABASE_ERROR = 9001,
  EXTERNAL_SERVICE_ERROR = 9002,
}

/**
 * Error code to message mapping
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.SUCCESS]: 'Success',

  // Authentication & Authorization
  [ErrorCode.INVALID_CREDENTIALS]: 'Telefon nomer yoki parol xato',
  [ErrorCode.INVALID_SMS_CODE]: 'Invalid SMS code',
  [ErrorCode.EXPIRED_SMS_CODE]: 'SMS code has expired',
  [ErrorCode.INVALID_TOKEN]: 'Invalid token',
  [ErrorCode.EXPIRED_TOKEN]: 'Token has expired',
  [ErrorCode.UNAUTHORIZED]: 'Unauthorized access',
  [ErrorCode.FORBIDDEN]: 'Access forbidden',
  [ErrorCode.ACCOUNT_DEACTIVATED]: 'User account is deactivated',
  [ErrorCode.TELEGRAM_ACCOUNT_NO_PASSWORD]:
    'This account was created via Telegram. Please use Telegram to login or set a password first.',

  // Validation Errors
  [ErrorCode.VALIDATION_ERROR]: 'Validation error',
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing',

  // Resource Not Found
  [ErrorCode.RESOURCE_NOT_FOUND]: 'Resource not found',
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.CENTER_NOT_FOUND]: 'Center not found',
  [ErrorCode.ROLE_NOT_FOUND]: 'Role not found',
  [ErrorCode.PERMISSION_NOT_FOUND]: 'Permission not found',
  [ErrorCode.VERIFICATION_SESSION_NOT_FOUND]: 'Verification session not found',

  // Conflict Errors
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 'Resource already exists',
  [ErrorCode.USER_ALREADY_EXISTS]: 'User already exists',
  [ErrorCode.PHONE_NUMBER_ALREADY_EXISTS]:
    'User with this phone number already exists',
  [ErrorCode.USERNAME_ALREADY_EXISTS]: 'Username already taken',

  // Business Logic Errors
  [ErrorCode.SMS_SEND_FAILED]: 'Failed to send SMS',
  [ErrorCode.MAX_ATTEMPTS_EXCEEDED]: 'Maximum attempts exceeded',
  [ErrorCode.OPERATION_NOT_ALLOWED]: 'Operation not allowed',
  [ErrorCode.SMS_RATE_LIMIT_EXCEEDED]: 'SMS rate limit exceeded',

  // System Errors
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [ErrorCode.DATABASE_ERROR]: 'Database error occurred',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service error',
};
