import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto';
import { SubscriptionStatus as PrismaSubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async create(createSubscriptionDto: CreateSubscriptionDto) {
    const { centerId, planId, ...rest } = createSubscriptionDto;

    // Check if center exists
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });

    if (!center) {
      throw new BadRequestException('Center not found');
    }

    // Check if plan exists
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new BadRequestException('Plan not found');
    }

    // Check if center already has an active subscription
    const existingSubscription = await this.prisma.centerSubscription.findFirst(
      {
        where: {
          centerId,
          status: {
            in: ['ACTIVE' as PrismaSubscriptionStatus, 'TRIAL' as PrismaSubscriptionStatus],
          },
        },
      },
    );

    if (existingSubscription) {
      throw new ConflictException(
        'Center already has an active subscription',
      );
    }

    return this.prisma.centerSubscription.create({
      data: {
        centerId,
        planId,
        currentPeriodStart: new Date(rest.currentPeriodStart),
        currentPeriodEnd: new Date(rest.currentPeriodEnd),
        status: rest.status as PrismaSubscriptionStatus || 'ACTIVE' as PrismaSubscriptionStatus,
        cancelAtPeriodEnd: rest.cancelAtPeriodEnd,
        externalCustomerId: rest.externalCustomerId,
        externalSubscriptionId: rest.externalSubscriptionId,
      },
      include: {
        center: true,
        plan: true,
      },
    });
  }

  async findAll(centerId?: number, status?: string) {
    const where: any = {};

    if (centerId) {
      where.centerId = centerId;
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.centerSubscription.findMany({
      where,
      include: {
        center: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            key: true,
            monthlyPrice: true,
            currency: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const subscription = await this.prisma.centerSubscription.findUnique({
      where: { id },
      include: {
        center: true,
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async findByCenterId(centerId: number) {
    return this.prisma.centerSubscription.findMany({
      where: { centerId },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getActiveSubscription(centerId: number) {
    const subscription = await this.prisma.centerSubscription.findFirst({
      where: {
        centerId,
        status: {
          in: ['ACTIVE' as PrismaSubscriptionStatus, 'TRIAL' as PrismaSubscriptionStatus],
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      throw new NotFoundException(
        'No active subscription found for this center',
      );
    }

    return subscription;
  }

  async update(id: number, updateSubscriptionDto: UpdateSubscriptionDto) {
    const subscription = await this.prisma.centerSubscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const updateData: any = { ...updateSubscriptionDto };

    if (updateData.currentPeriodStart) {
      updateData.currentPeriodStart = new Date(updateData.currentPeriodStart);
    }

    if (updateData.currentPeriodEnd) {
      updateData.currentPeriodEnd = new Date(updateData.currentPeriodEnd);
    }

    if (updateData.status) {
      updateData.status = updateData.status as PrismaSubscriptionStatus;
    }

    return this.prisma.centerSubscription.update({
      where: { id },
      data: updateData,
      include: {
        center: true,
        plan: true,
      },
    });
  }

  async cancel(id: number, immediately: boolean = false) {
    const subscription = await this.prisma.centerSubscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === 'CANCELED' as PrismaSubscriptionStatus) {
      throw new BadRequestException('Subscription is already canceled');
    }

    if (immediately) {
      return this.prisma.centerSubscription.update({
        where: { id },
        data: {
          status: 'CANCELED' as PrismaSubscriptionStatus,
        },
        include: {
          center: true,
          plan: true,
        },
      });
    } else {
      return this.prisma.centerSubscription.update({
        where: { id },
        data: {
          cancelAtPeriodEnd: true,
        },
        include: {
          center: true,
          plan: true,
        },
      });
    }
  }

  async reactivate(id: number) {
    const subscription = await this.prisma.centerSubscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== 'CANCELED' as PrismaSubscriptionStatus) {
      throw new BadRequestException('Only canceled subscriptions can be reactivated');
    }

    return this.prisma.centerSubscription.update({
      where: { id },
      data: {
        status: 'ACTIVE' as PrismaSubscriptionStatus,
        cancelAtPeriodEnd: false,
      },
      include: {
        center: true,
        plan: true,
      },
    });
  }

  async checkAndUpdateExpiredSubscriptions() {
    const now = new Date();

    // Find expired subscriptions
    const expiredSubscriptions = await this.prisma.centerSubscription.findMany(
      {
        where: {
          currentPeriodEnd: {
            lte: now,
          },
          status: {
            in: ['ACTIVE' as PrismaSubscriptionStatus, 'TRIAL' as PrismaSubscriptionStatus],
          },
        },
      },
    );

    const updated: any[] = [];

    for (const subscription of expiredSubscriptions) {
      if (subscription.cancelAtPeriodEnd) {
        // Cancel subscription
        const result = await this.prisma.centerSubscription.update({
          where: { id: subscription.id },
          data: {
            status: 'CANCELED' as PrismaSubscriptionStatus,
          },
        });
        updated.push(result);
      } else {
        // Mark as past due (needs payment)
        const result = await this.prisma.centerSubscription.update({
          where: { id: subscription.id },
          data: {
            status: 'PAST_DUE' as PrismaSubscriptionStatus,
          },
        });
        updated.push(result);
      }
    }

    return {
      message: 'Expired subscriptions updated',
      count: updated.length,
      subscriptions: updated,
    };
  }
}

