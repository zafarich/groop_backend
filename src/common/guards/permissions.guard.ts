import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract user permissions from roles
    const userPermissions = this.extractUserPermissions(user);

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private extractUserPermissions(user: any): string[] {
    if (!user.userRoles || user.userRoles.length === 0) {
      return [];
    }

    const permissions = new Set<string>();

    user.userRoles.forEach((userRole: any) => {
      if (userRole.role && userRole.role.rolePermissions) {
        userRole.role.rolePermissions.forEach((rolePermission: any) => {
          if (rolePermission.permission) {
            permissions.add(rolePermission.permission.slug);
          }
        });
      }
    });

    return Array.from(permissions);
  }
}

