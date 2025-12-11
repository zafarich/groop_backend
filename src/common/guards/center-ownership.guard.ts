import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { RESOURCE_CENTER_CHECK_KEY } from '../decorators/check-center-ownership.decorator';

@Injectable()
export class CenterOwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const checkConfig = this.reflector.get<{
      resourceName: string;
      paramName: string;
    }>(RESOURCE_CENTER_CHECK_KEY, context.getHandler());

    // If no config, skip this guard
    if (!checkConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = parseInt(request.params[checkConfig.paramName]);

    if (!user || !user.activeCenterId) {
      throw new ForbiddenException('User center information not found');
    }

    if (!resourceId || isNaN(resourceId)) {
      throw new ForbiddenException('Invalid resource ID');
    }

    // Check if resource belongs to user's active center
    const belongsToCenter = await this.checkResourceOwnership(
      checkConfig.resourceName,
      resourceId,
      user.activeCenterId,
    );

    if (!belongsToCenter) {
      throw new ForbiddenException(
        `You do not have access to this ${checkConfig.resourceName}`,
      );
    }

    return true;
  }

  private async checkResourceOwnership(
    resourceName: string,
    resourceId: number,
    centerId: number,
  ): Promise<boolean> {
    try {
      // Map resource names to Prisma models
      const modelMap: Record<string, any> = {
        teacher: this.prisma.teacher,
        student: this.prisma.student,
        group: this.prisma.group,
        center: this.prisma.center,
        role: this.prisma.role,
        user: this.prisma.user,
        'payment-card': this.prisma.centerPaymentCard,
        subscription: this.prisma.centerSubscription,
        'center-bot': this.prisma.centerTelegramBot,
        enrollment: this.prisma.enrollment,
        payment: this.prisma.payment,
        // Add more resources as needed
      };

      const model = modelMap[resourceName.toLowerCase()];

      if (!model) {
        throw new Error(`Unknown resource type: ${resourceName}`);
      }

      // Find the resource and check centerId
      const resource = await model.findUnique({
        where: { id: resourceId },
        select: { centerId: true, isDeleted: true },
      });

      if (!resource) {
        throw new NotFoundException(`${resourceName} not found`);
      }

      if (resource.isDeleted) {
        throw new NotFoundException(`${resourceName} not found`);
      }

      return resource.centerId === centerId;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      // Log unexpected errors
      console.error('Error checking resource ownership:', error);
      return false;
    }
  }
}
