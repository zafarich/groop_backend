import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FilterPaymentsDto } from './dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all payments for a center with filters and pagination
   */
  async findAll(centerId: number, filterDto: FilterPaymentsDto) {
    const { status, groupId, search, page = 1, limit = 10 } = filterDto;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.PaymentWhereInput = {
      centerId,
      isDeleted: false,
    };

    // Add status filter
    if (status) {
      where.status = status;
    }

    // Add group filter
    if (groupId) {
      where.groupId = groupId;
    }

    // Add search filter (by student name or phone)
    if (search) {
      where.student = {
        OR: [
          {
            firstName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            user: {
              OR: [
                {
                  firstName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  phoneNumber: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        ],
      };
    }

    // Get total count
    const total = await this.prisma.payment.count({ where });

    // Get payments with relations
    const payments = await this.prisma.payment.findMany({
      where,
      skip,
      take: limit,
      include: {
        group: {
          select: {
            id: true,
            name: true,
            monthlyPrice: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                telegramUserId: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform payments to add receiptUrl
    const baseUrl =
      process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const paymentsWithUrl = payments.map((payment) => ({
      ...payment,
      receiptUrl: payment.receiptPath
        ? `${baseUrl}/${payment.receiptPath}`
        : null,
    }));

    return {
      success: true,
      code: 0,
      data: paymentsWithUrl,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      message: 'Payments retrieved successfully',
    };
  }

  /**
   * Get a single payment by ID
   */
  async findOne(id: number, centerId: number) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        centerId,
        isDeleted: false,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            monthlyPrice: true,
            courseStartDate: true,
            courseEndDate: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                telegramUserId: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Add receiptUrl to response
    const baseUrl =
      process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const paymentWithUrl = {
      ...payment,
      receiptUrl: payment.receiptPath
        ? `${baseUrl}/${payment.receiptPath}`
        : null,
    };

    return {
      success: true,
      code: 0,
      data: paymentWithUrl,
      message: 'Payment retrieved successfully',
    };
  }

  /**
   * Get payment statistics for a center
   */
  async getStats(centerId: number) {
    const [pending, paid, overdue, cancelled] = await Promise.all([
      this.prisma.payment.count({
        where: { centerId, status: 'PENDING', isDeleted: false },
      }),
      this.prisma.payment.count({
        where: { centerId, status: 'PAID', isDeleted: false },
      }),
      this.prisma.payment.count({
        where: { centerId, status: 'OVERDUE', isDeleted: false },
      }),
      this.prisma.payment.count({
        where: { centerId, status: 'CANCELLED', isDeleted: false },
      }),
    ]);

    return {
      success: true,
      code: 0,
      data: {
        pending,
        paid,
        overdue,
        cancelled,
        total: pending + paid + overdue + cancelled,
      },
      message: 'Payment statistics retrieved successfully',
    };
  }
}
