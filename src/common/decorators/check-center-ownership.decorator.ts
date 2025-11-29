import { SetMetadata } from '@nestjs/common';

export const RESOURCE_CENTER_CHECK_KEY = 'resourceCenterCheck';

/**
 * Decorator to enable automatic center ownership validation
 * @param options Configuration for center check
 * @param options.resourceName - Name of the resource (e.g., 'teacher', 'student')
 * @param options.paramName - Name of the route parameter containing the resource ID (default: 'id')
 */
export const CheckCenterOwnership = (options: {
  resourceName: string;
  paramName?: string;
}) =>
  SetMetadata(RESOURCE_CENTER_CHECK_KEY, {
    resourceName: options.resourceName,
    paramName: options.paramName || 'id',
  });
