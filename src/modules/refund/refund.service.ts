import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateRefundDto, ProcessRefundDto } from './dto';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

  /**
   * Calculate refund amount based on lessons attended
   * Formula: refundAmount = totalPaid - (lessonsAttended * pricePerLesson)
   */
  private calculateRefundAmount(
    totalPaid: number,
    lessonsAttended: number,
    totalLessons: number,
  ): number {
    if (totalLessons === 0) return 0;

    const pricePerLesson = totalPaid / totalLessons;
    const refundAmount = totalPaid - lessonsAttended * pricePerLesson;

    return Math.max(0, Math.round(refundAmount)); // Never negative, round to integer
  }

  /**
   * Calculate total lessons in group from start to now
   */
  private calculateTotalLessons(
    lessonSchedules: any[],
    courseStartDate: Date,
  ): number {
    const now = new Date();
    let totalLessons = 0;

    // Iterate through each week from course start to now
    const currentDate = new Date(courseStartDate);
    while (currentDate <= now) {
      const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay(); // Convert Sunday from 0 to 7

      // Check if there's a lesson on this day
      const hasLesson = lessonSchedules.some(
        (schedule) => schedule.dayOfWeek === dayOfWeek,
      );

      if (hasLesson) {
        totalLessons++;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return totalLessons;
  }

  /**
   * Create a refund request
   */
  async createRefund(dto: CreateRefundDto, centerId: number) {
    // Find enrollment with all necessary data
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: dto.enrollmentId,
        isDeleted: false,
        group: {
          centerId,
          isDeleted: false,
        },
      },
      include: {
        group: {
          include: {
            lessonSchedules: true,
          },
        },
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                telegramUserId: true,
              },
            },
            payments: {
              where: {
                groupId: dto.enrollmentId,
                status: 'PAID',
                isDeleted: false,
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    // Check if student can request refund
    if (
      enrollment.status !== 'ACTIVE' &&
      enrollment.status !== 'FROZEN' &&
      enrollment.status !== 'DROPPED'
    ) {
      throw new BadRequestException(
        `Cannot request refund for enrollment with status ${enrollment.status}`,
      );
    }

    // Check if there's already a pending refund request
    const existingRefund = await this.prisma.refundRequest.findFirst({
      where: {
        studentId: enrollment.studentId,
        groupId: enrollment.groupId,
        status: 'PENDING',
        isDeleted: false,
      },
    });

    if (existingRefund) {
      throw new BadRequestException(
        'Student already has a pending refund request for this group',
      );
    }

    // Calculate total paid amount
    const totalPaid = enrollment.student.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    if (totalPaid === 0) {
      throw new BadRequestException(
        'No payments found for this enrollment. Cannot process refund.',
      );
    }

    // Calculate total lessons from course start to now
    const totalLessons = this.calculateTotalLessons(
      enrollment.group.lessonSchedules,
      enrollment.group.courseStartDate,
    );

    // For simplicity, we assume student attended all lessons up to now
    // In a real system, you'd track actual attendance
    const lessonsAttended = totalLessons;

    // Calculate refund amount
    const refundAmount = this.calculateRefundAmount(
      totalPaid,
      lessonsAttended,
      totalLessons,
    );

    // Create refund request
    const refundRequest = await this.prisma.refundRequest.create({
      data: {
        centerId,
        studentId: enrollment.studentId,
        groupId: enrollment.groupId,
        requestReason: dto.requestReason,
        totalPaid,
        lessonsAttended,
        totalLessons,
        refundAmount,
        status: 'PENDING',
      },
      include: {
        student: {
          include: {
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

    this.logger.log(
      `Created refund request ${refundRequest.id} for student ${enrollment.studentId}, ` +
        `amount: ${refundAmount} UZS`,
    );

    // Send Telegram notification
    await this.telegramService.notifyStudentAboutRefund(
      refundRequest,
      'CREATED',
    );

    return {
      success: true,
      code: 0,
      data: refundRequest,
      message: 'Refund request created successfully',
    };
  }

  /**
   * Process a refund request (approve or reject)
   */
  async processRefund(
    refundId: number,
    dto: ProcessRefundDto,
    adminUserId: number,
    centerId: number,
  ) {
    // Find refund request
    const refundRequest = await this.prisma.refundRequest.findFirst({
      where: {
        id: refundId,
        centerId,
        isDeleted: false,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                telegramUserId: true,
              },
            },
          },
        },
      },
    });

    if (!refundRequest) {
      throw new NotFoundException('Refund request not found');
    }

    if (refundRequest.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot process refund with status ${refundRequest.status}`,
      );
    }

    // Update refund request
    const updatedRefund = await this.prisma.refundRequest.update({
      where: { id: refundId },
      data: {
        status: dto.decision,
        processedBy: adminUserId,
        processedAt: new Date(),
        processingNotes: dto.processingNotes,
        completedAt: dto.decision === 'APPROVED' ? new Date() : null,
      },
      include: {
        student: {
          include: {
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

    // If approved, update enrollment status to DROPPED
    if (dto.decision === 'APPROVED') {
      await this.prisma.enrollment.updateMany({
        where: {
          studentId: refundRequest.studentId,
          groupId: refundRequest.groupId,
          isDeleted: false,
        },
        data: {
          status: 'DROPPED',
          removedAt: new Date(),
          removalReason: 'REFUND_APPROVED',
        },
      });

      this.logger.log(
        `Approved refund ${refundId}, amount: ${Number(refundRequest.refundAmount)} UZS`,
      );

      // Send approval notification
      await this.telegramService.notifyStudentAboutRefund(
        updatedRefund,
        'APPROVED',
      );
    } else {
      this.logger.log(`Rejected refund ${refundId}`);

      // Send rejection notification
      await this.telegramService.notifyStudentAboutRefund(
        updatedRefund,
        'REJECTED',
      );
    }

    return {
      success: true,
      code: 0,
      data: updatedRefund,
      message: `Refund ${dto.decision.toLowerCase()} successfully`,
    };
  }

  /**
   * Get all refund requests for a center
   */
  async getRefundRequests(
    centerId: number,
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED',
  ) {
    const where: any = {
      centerId,
      isDeleted: false,
    };

    if (status) {
      where.status = status;
    }

    const refunds = await this.prisma.refundRequest.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      code: 0,
      data: refunds,
      message: 'Refund requests retrieved successfully',
    };
  }

  /**
   * Get a single refund request
   */
  async getRefundById(refundId: number, centerId: number) {
    const refund = await this.prisma.refundRequest.findFirst({
      where: {
        id: refundId,
        centerId,
        isDeleted: false,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                telegramUserId: true,
              },
            },
            payments: {
              where: {
                groupId: refundId,
                status: 'PAID',
                isDeleted: false,
              },
            },
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    return {
      success: true,
      code: 0,
      data: refund,
      message: 'Refund request retrieved successfully',
    };
  }
}
