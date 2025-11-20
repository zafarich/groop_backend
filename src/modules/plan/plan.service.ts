import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePlanDto, UpdatePlanDto } from './dto';

@Injectable()
export class PlanService {
  constructor(private prisma: PrismaService) {}

  async create(createPlanDto: CreatePlanDto) {
    const { key, ...rest } = createPlanDto;

    // Check if plan with same key exists
    const existingPlan = await this.prisma.plan.findUnique({
      where: { key },
    });

    if (existingPlan) {
      throw new ConflictException('Plan with this key already exists');
    }

    return this.prisma.plan.create({
      data: {
        key,
        ...rest,
      },
    });
  }

  async findAll(isActive?: boolean) {
    const where = isActive !== undefined ? { isActive } : {};

    return this.prisma.plan.findMany({
      where,
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
      orderBy: {
        monthlyPrice: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: {
            center: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  async findByKey(key: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { key },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  async update(id: number, updatePlanDto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Check if key is being updated and if it conflicts
    if (updatePlanDto.key && updatePlanDto.key !== plan.key) {
      const existingPlan = await this.prisma.plan.findUnique({
        where: { key: updatePlanDto.key },
      });

      if (existingPlan) {
        throw new ConflictException('Plan with this key already exists');
      }
    }

    return this.prisma.plan.update({
      where: { id },
      data: updatePlanDto,
    });
  }

  async remove(id: number) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (plan._count.subscriptions > 0) {
      throw new ConflictException(
        'Cannot delete plan with active subscriptions',
      );
    }

    await this.prisma.plan.delete({
      where: { id },
    });

    return { message: 'Plan deleted successfully' };
  }

  async seedDefaultPlans() {
    const defaultPlans = [
      {
        key: 'free',
        name: 'Free',
        description: 'Bepul rejа - asosiy funksiyalar',
        monthlyPrice: 0,
        currency: 'USD',
        maxStudents: 50,
        maxTeachers: 5,
        maxGroups: 10,
        maxCenters: 1,
        featuresJson: JSON.stringify([
          'basic_reports',
          'student_management',
          'attendance_tracking',
        ]),
        isActive: true,
      },
      {
        key: 'pro',
        name: 'Pro',
        description: 'Professional reja - kengaytirilgan imkoniyatlar',
        monthlyPrice: 4900,
        currency: 'USD',
        maxStudents: 500,
        maxTeachers: 50,
        maxGroups: 100,
        maxCenters: 5,
        featuresJson: JSON.stringify([
          'basic_reports',
          'advanced_reports',
          'student_management',
          'attendance_tracking',
          'payment_tracking',
          'sms_notifications',
          'telegram_integration',
        ]),
        isActive: true,
      },
      {
        key: 'enterprise',
        name: 'Enterprise',
        description: 'Enterprise reja - cheksiz imkoniyatlar',
        monthlyPrice: 14900,
        currency: 'USD',
        maxStudents: null,
        maxTeachers: null,
        maxGroups: null,
        maxCenters: null,
        featuresJson: JSON.stringify([
          'basic_reports',
          'advanced_reports',
          'custom_reports',
          'student_management',
          'attendance_tracking',
          'payment_tracking',
          'sms_notifications',
          'telegram_integration',
          'whatsapp_integration',
          'api_access',
          'custom_branding',
          'priority_support',
        ]),
        isActive: true,
      },
    ];

    const createdPlans: any[] = [];

    for (const planData of defaultPlans) {
      const existing = await this.prisma.plan.findUnique({
        where: { key: planData.key },
      });

      if (!existing) {
        const created = await this.prisma.plan.create({
          data: planData,
        });
        createdPlans.push(created);
      }
    }

    return {
      message: 'Default plans seeded successfully',
      count: createdPlans.length,
      plans: createdPlans,
    };
  }
}

