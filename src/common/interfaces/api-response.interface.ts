/**
 * Standard API Response Interface
 * All API endpoints should return responses in this format
 */
export interface ApiResponse<T = any> {
  /**
   * Indicates if the request was successful
   * true = success, false = error
   */
  success: boolean;

  /**
   * Response code
   * 0 = success
   * > 0 = specific error code (1001, 1002, etc.)
   */
  code: number;

  /**
   * Response data payload
   * Contains the actual response data for successful requests
   * null for error responses
   */
  data: T | null;

  /**
   * Response message
   * Descriptive message about the response
   */
  message: string;
}

/**
 * Type alias for successful responses
 */
export type SuccessResponse<T> = ApiResponse<T> & {
  success: true;
  code: 0;
  data: T;
};

/**
 * Type alias for error responses
 */
export type ErrorResponse = ApiResponse<null> & {
  success: false;
  code: number;
  data: null;
};
