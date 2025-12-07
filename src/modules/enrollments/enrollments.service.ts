import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  AssignDiscountDto,
  ActivateEnrollmentDto,
  FilterEnrollmentsDto,
} from './dto';
import { LessonSchedule, Prisma, Payment } from '@prisma/client';

export interface ProratedPriceResult {
  periodStart: Date;
  periodEnd: Date;
  totalLessonsInPeriod: number;
  lessonsMissed: number;
  lessonsIncluded: number;
  baseLessonPrice: number;
  effectiveLessonPrice: number; // After custom pricing
  proratedAmount: number;
  isProrated: boolean;
  customPriceApplied: boolean; // Whether custom price was used
}

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all leads (students pending activation) for a group
   * @deprecated Use findStudentsByGroup with status filter instead
   */
  async findLeads(groupId: number, centerId: number) {
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        centerId,
        isDeleted: false,
      },
    });

    if (!group) {
      throw new NotFoundException(`Group not found`);
    }

    const leads = await this.prisma.enrollment.findMany({
      where: {
        groupId,
        status: 'LEAD',
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
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return {
      success: true,
      code: 0,
      data: leads,
      message: 'Leads retrieved successfully',
    };
  }

  /**
   * Get students by group with pagination and filters
   */
  async findStudentsByGroup(
    groupId: number,
    centerId: number,
    filterDto: FilterEnrollmentsDto,
  ) {
    // Validate group exists and belongs to center
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        centerId,
        isDeleted: false,
      },
    });

    if (!group) {
      throw new NotFoundException(`Group not found`);
    }

    const { page = 1, limit = 10, status, search } = filterDto;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.EnrollmentWhereInput = {
      groupId,
      isDeleted: false,
    };

    // Add status filter if provided
    if (status) {
      where.status = status;
    }

    // Add search filter if provided (search in student name)
    if (search) {
      where.OR = [
        {
          student: {
            firstName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          student: {
            lastName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          student: {
            user: {
              firstName: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          student: {
            user: {
              lastName: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    // Get total count for pagination
    const total = await this.prisma.enrollment.count({ where });

    // Get paginated enrollments
    const enrollments = await this.prisma.enrollment.findMany({
      where,
      skip,
      take: limit,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                id: true,
                phoneNumber: true,
                telegramUserId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return {
      success: true,
      code: 0,
      data: enrollments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      message: 'Students retrieved successfully',
    };
  }

  /**
   * Get enrollment by ID (internal use - returns raw enrollment)
   */
  private async findOneRaw(enrollmentId: number) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        isDeleted: false,
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
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment not found`);
    }

    return enrollment;
  }

  /**
   * Get enrollment by ID with validation
   */
  async findOne(enrollmentId: number) {
    const enrollment = await this.findOneRaw(enrollmentId);

    return {
      success: true,
      code: 0,
      data: enrollment,
      message: 'Enrollment retrieved successfully',
    };
  }

  /**
   * Get activation preview - calculates proration without making DB changes
   */
  async getActivationPreview(enrollmentId: number, lessonStartDate: Date) {
    const enrollment = await this.findOneRaw(enrollmentId);

    if (enrollment.status !== 'LEAD' && enrollment.status !== 'TRIAL') {
      throw new BadRequestException(
        `Enrollment is already ${enrollment.status}. Cannot calculate activation preview.`,
      );
    }

    // Get effective monthly price (custom or group price)
    const effectiveMonthlyPrice = this.getEffectiveMonthlyPrice(
      enrollment.customMonthlyPrice ? Number(enrollment.customMonthlyPrice) : null,
      enrollment.discountStartDate,
      enrollment.discountEndDate,
      Number(enrollment.group.monthlyPrice),
      lessonStartDate,
    );

    const preview = this.calculateProratedPrice(
      enrollment.group,
      enrollment.group.lessonSchedules,
      lessonStartDate,
      effectiveMonthlyPrice,
    );

    return {
      success: true,
      code: 0,
      data: preview,
      message: 'Activation preview calculated successfully',
    };
  }

  /**
   * Activate enrollment - set start date, calculate prices, create payment
   */
  async activateEnrollment(
    enrollmentId: number,
    dto: ActivateEnrollmentDto,
    centerId: number,
  ) {
    const enrollment = await this.findOneRaw(enrollmentId);

    // Validate enrollment belongs to center
    if (enrollment.group.centerId !== centerId) {
      throw new NotFoundException(`Enrollment not found`);
    }

    if (enrollment.status !== 'LEAD' && enrollment.status !== 'TRIAL') {
      throw new BadRequestException(
        `Cannot activate enrollment with status ${enrollment.status}. Only LEAD or TRIAL enrollments can be activated.`,
      );
    }

    const lessonStartDate = new Date(dto.lessonStartDate);

    // Validate date is within course period
    if (lessonStartDate < enrollment.group.courseStartDate) {
      throw new BadRequestException(
        `Start date cannot be before course start date (${enrollment.group.courseStartDate.toISOString().split('T')[0]})`,
      );
    }

    if (lessonStartDate > enrollment.group.courseEndDate) {
      throw new BadRequestException(
        `Start date cannot be after course end date (${enrollment.group.courseEndDate.toISOString().split('T')[0]})`,
      );
    }

    // Get effective monthly price (custom or group price)
    const effectiveMonthlyPrice = this.getEffectiveMonthlyPrice(
      enrollment.customMonthlyPrice ? Number(enrollment.customMonthlyPrice) : null,
      enrollment.discountStartDate,
      enrollment.discountEndDate,
      Number(enrollment.group.monthlyPrice),
      lessonStartDate,
    );

    // Calculate proration
    const proration = this.calculateProratedPrice(
      enrollment.group,
      enrollment.group.lessonSchedules,
      lessonStartDate,
      effectiveMonthlyPrice,
    );

    // Check for free enrollment
    const isFree: boolean =
      proration.effectiveLessonPrice === 0 || enrollment.isFreeEnrollment;

    // Calculate discount applied (difference from group price)
    const groupMonthlyPrice = Number(enrollment.group.monthlyPrice);
    const discountApplied = proration.customPriceApplied
      ? groupMonthlyPrice - effectiveMonthlyPrice
      : null;

    // Execute in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update enrollment
      const updatedEnrollment = await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'ACTIVE',
          lessonStartDate,
          baseLessonPrice: proration.baseLessonPrice,
          perLessonPrice: proration.effectiveLessonPrice,
          nextPaymentDate: proration.periodEnd, // Next payment after this period
        },
      });

      // Create first payment (unless free)
      let payment: Payment | null = null;
      if (!isFree && proration.proratedAmount > 0) {
        payment = await tx.payment.create({
          data: {
            centerId,
            groupId: enrollment.groupId,
            studentId: enrollment.studentId,
            enrollmentId: enrollment.id,
            amount: proration.proratedAmount,
            currency: 'UZS',
            periodStart: proration.periodStart,
            periodEnd: proration.periodEnd,
            paymentType: enrollment.group.paymentType,
            lessonsIncluded: proration.lessonsIncluded,
            lessonsInPeriod: proration.totalLessonsInPeriod,
            lessonsMissed: proration.lessonsMissed,
            lessonPrice: proration.effectiveLessonPrice,
            discountApplied,
            isProrated: proration.isProrated,
            status: 'PENDING',
            dueDate: new Date(), // Due immediately
          },
        });
      }

      return { enrollment: updatedEnrollment, payment, proration };
    });

    this.logger.log(
      `Activated enrollment ${enrollmentId}: ${proration.lessonsIncluded} lessons, amount: ${proration.proratedAmount}`,
    );

    return result;
  }

  /**
   * Assign or update custom pricing for an enrollment
   * @param enrollmentId - Enrollment ID
   * @param dto - Custom price details (customMonthlyPrice, discountStartDate, discountEndDate, discountReason)
   */
  async assignDiscount(enrollmentId: number, dto: AssignDiscountDto) {
    const enrollment = await this.findOneRaw(enrollmentId);

    // Determine if this is a free enrollment (customMonthlyPrice = 0)
    const isFreeEnrollment = dto.customMonthlyPrice === 0;

    // Parse dates
    const discountStartDate = dto.discountStartDate
      ? new Date(dto.discountStartDate)
      : null;
    const discountEndDate = dto.discountEndDate
      ? new Date(dto.discountEndDate)
      : null;

    // Calculate new per-lesson price if enrollment is already active
    let perLessonPrice = Number(enrollment.perLessonPrice);
    if (enrollment.status === 'ACTIVE' && enrollment.lessonStartDate) {
      const effectiveMonthlyPrice = this.getEffectiveMonthlyPrice(
        dto.customMonthlyPrice,
        discountStartDate,
        discountEndDate,
        Number(enrollment.group.monthlyPrice),
        new Date(), // Current date for checking validity
      );

      const proration = this.calculateProratedPrice(
        enrollment.group,
        enrollment.group.lessonSchedules,
        enrollment.lessonStartDate,
        effectiveMonthlyPrice,
      );
      perLessonPrice = proration.effectiveLessonPrice;
    }

    // If free enrollment (0), automatically activate
    let newStatus = enrollment.status;
    if (isFreeEnrollment && (enrollment.status === 'LEAD' || enrollment.status === 'TRIAL')) {
      newStatus = 'ACTIVE';
    }

    const updatedEnrollment = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        customMonthlyPrice: dto.customMonthlyPrice,
        discountStartDate,
        discountEndDate,
        discountReason: dto.discountReason,
        isFreeEnrollment,
        perLessonPrice,
        status: newStatus,
      },
      include: {
        group: true,
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
      `Updated custom price for enrollment ${enrollmentId}: ${dto.customMonthlyPrice} UZS, ` +
        `valid from ${dto.discountStartDate || 'now'} to ${dto.discountEndDate || 'forever'}` +
        (dto.discountReason ? `, reason: ${dto.discountReason}` : ''),
    );

    return {
      success: true,
      code: 0,
      data: updatedEnrollment,
      message: 'Custom price assigned successfully',
      shouldNotifyStudent: true, // Flag to indicate notification needed
      isFreeEnrollment,
    };
  }

  /**
   * Get effective monthly price based on custom pricing and validity period
   */
  private getEffectiveMonthlyPrice(
    customMonthlyPrice: number | null,
    discountStartDate: Date | null,
    discountEndDate: Date | null,
    groupMonthlyPrice: number,
    currentDate: Date,
  ): number {
    // If no custom price set, use group price
    if (customMonthlyPrice === null) {
      return groupMonthlyPrice;
    }

    // Check if custom price is within validity period
    const isAfterStart = !discountStartDate || currentDate >= discountStartDate;
    const isBeforeEnd = !discountEndDate || currentDate <= discountEndDate;

    if (isAfterStart && isBeforeEnd) {
      return customMonthlyPrice; // 0 for free, or custom amount
    }

    // Outside validity period, use group price
    return groupMonthlyPrice;
  }

  /**
   * Calculate prorated price for a given start date
   * @param group - Group with pricing and course dates
   * @param schedules - Lesson schedules for the group
   * @param lessonStartDate - When student's lessons start
   * @param effectiveMonthlyPrice - The monthly price to use (custom or group price)
   */
  private calculateProratedPrice(
    group: {
      monthlyPrice: Prisma.Decimal;
      courseStartDate: Date;
      courseEndDate: Date;
    },
    schedules: LessonSchedule[],
    lessonStartDate: Date,
    effectiveMonthlyPrice: number,
  ): ProratedPriceResult {
    // Determine billing period (current month)
    const periodStart = new Date(
      lessonStartDate.getFullYear(),
      lessonStartDate.getMonth(),
      1,
    );
    const periodEnd = new Date(
      lessonStartDate.getFullYear(),
      lessonStartDate.getMonth() + 1,
      0, // Last day of current month
    );

    // Adjust period if it extends beyond course dates
    const effectivePeriodStart =
      periodStart < group.courseStartDate ? group.courseStartDate : periodStart;
    const effectivePeriodEnd =
      periodEnd > group.courseEndDate ? group.courseEndDate : periodEnd;

    // Count total lessons in the full month
    const totalLessonsInPeriod = this.countLessonsInPeriod(
      schedules,
      effectivePeriodStart,
      effectivePeriodEnd,
    );

    // Count lessons missed (before start date)
    const lessonsMissed = this.countLessonsInPeriod(
      schedules,
      effectivePeriodStart,
      new Date(lessonStartDate.getTime() - 24 * 60 * 60 * 1000), // Day before start
    );

    const lessonsIncluded = totalLessonsInPeriod - lessonsMissed;

    // Calculate prices based on effective monthly price
    const groupMonthlyPrice = Number(group.monthlyPrice);
    const customPriceApplied = effectiveMonthlyPrice !== groupMonthlyPrice;

    // Base lesson price (from group price, for reference)
    const baseLessonPrice =
      totalLessonsInPeriod > 0
        ? Math.round(groupMonthlyPrice / totalLessonsInPeriod)
        : 0;

    // Effective lesson price (from custom or group price)
    const effectiveLessonPrice =
      totalLessonsInPeriod > 0
        ? Math.round(effectiveMonthlyPrice / totalLessonsInPeriod)
        : 0;

    const proratedAmount = effectiveLessonPrice * lessonsIncluded;
    const isProrated = lessonsMissed > 0;

    return {
      periodStart: effectivePeriodStart,
      periodEnd: effectivePeriodEnd,
      totalLessonsInPeriod,
      lessonsMissed,
      lessonsIncluded,
      baseLessonPrice,
      effectiveLessonPrice,
      proratedAmount,
      isProrated,
      customPriceApplied,
    };
  }

  /**
   * Count lessons between two dates based on schedule
   */
  private countLessonsInPeriod(
    schedules: LessonSchedule[],
    startDate: Date,
    endDate: Date,
  ): number {
    if (startDate > endDate) return 0;

    let count = 0;
    const scheduledDays = schedules.map((s) => s.dayOfWeek);

    const current = new Date(startDate);
    while (current <= endDate) {
      // JavaScript: Sunday = 0, Monday = 1, ..., Saturday = 6
      // Database: Monday = 1, ..., Sunday = 7
      const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay();

      if (scheduledDays.includes(dayOfWeek)) {
        count++;
      }

      current.setDate(current.getDate() + 1);
    }

    return count;
  }
}
