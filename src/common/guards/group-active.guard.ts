import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupActiveGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Try to find groupId in params (e.g. /groups/:id/...)
    let groupId = request.params.id ? parseInt(request.params.id, 10) : null;

    // If not in params, try body (e.g. creating enrollment)
    if (!groupId && request.body && request.body.groupId) {
      groupId = parseInt(request.body.groupId, 10);
    }

    // If no groupId found, we can't check, so we assume it's not a group-specific operation
    // or the controller will handle the missing ID.
    // However, if this guard is applied, it implies a group check is needed.
    // Let's return true if no ID found to avoid blocking unrelated requests if applied globally,
    // but typically this should be applied to specific endpoints.
    if (!groupId || isNaN(groupId)) {
      return true;
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { status: true, isDeleted: true },
    });

    if (!group || group.isDeleted) {
      throw new NotFoundException('Group not found');
    }

    if (group.status === 'PENDING') {
      throw new BadRequestException(
        'This group is not yet active. Please complete the Telegram connection setup first.',
      );
    }

    return true;
  }
}
