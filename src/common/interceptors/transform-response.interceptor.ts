import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';
import { ErrorCode } from '../constants/error-codes';

/**
 * Interceptor to transform all successful responses into standardized format
 */
@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the response is already in the standardized format, return as is
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'code' in data &&
          'data' in data &&
          'message' in data
        ) {
          return data as ApiResponse<T>;
        }

        // Transform to standardized format
        return {
          success: true,
          code: ErrorCode.SUCCESS,
          data: data as T,
          message: 'Success',
        };
      }),
    );
  }
}
