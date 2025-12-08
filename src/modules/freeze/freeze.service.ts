import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateFreezeDto, EndFreezeDto } from './dto';

@Injectable()
export class FreezeService {
  private readonly logger = new Logger(FreezeService.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

  /**
   * Create a freeze request for a student
   */
  async createFreeze(dto: CreateFreezeDto, centerId: number) {
    // Validate enrollment exists and belongs to center
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
        group: true,
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

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    // Check if enrollment is in valid status for freezing
    if (enrollment.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot freeze enrollment with status ${enrollment.status}. Only ACTIVE enrollments can be frozen.`,
      );
    }

    // Check if there's already an active freeze
    const existingFreeze = await this.prisma.studentFreeze.findFirst({
      where: {
        enrollmentId: dto.enrollmentId,
        status: 'ACTIVE',
        isDeleted: false,
      },
    });

    if (existingFreeze) {
      throw new BadRequestException(
        'Student already has an active freeze request',
      );
    }

    const freezeStartDate = new Date(dto.freezeStartDate);
    const freezeEndDate = dto.freezeEndDate
      ? new Date(dto.freezeEndDate)
      : null;

    // Validate dates
    if (freezeEndDate && freezeEndDate <= freezeStartDate) {
      throw new BadRequestException('Freeze end date must be after start date');
    }

    // Create freeze and update enrollment in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create freeze record
      const freeze = await tx.studentFreeze.create({
        data: {
          enrollmentId: dto.enrollmentId,
          studentId: enrollment.studentId,
          reason: dto.reason,
          freezeStartDate,
          freezeEndDate,
          status: 'ACTIVE',
        },
      });

      // Update enrollment status to FROZEN
      const updatedEnrollment = await tx.enrollment.update({
        where: { id: dto.enrollmentId },
        data: {
          status: 'FROZEN',
          // Note: balance remains unchanged - student keeps their credit
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
                  telegramUserId: true,
                },
              },
            },
          },
        },
      });

      return { freeze, enrollment: updatedEnrollment };
    });

    this.logger.log(
      `Created freeze for enrollment ${dto.enrollmentId}, ` +
        `from ${freezeStartDate.toISOString()} to ${freezeEndDate?.toISOString() || 'indefinite'}`,
    );

    // Send Telegram notification
    await this.telegramService.notifyStudentAboutFreeze(result, 'CREATED');

    return {
      success: true,
      code: 0,
      data: result,
      message: 'Freeze created successfully',
    };
  }

  /**
   * End an active freeze
   */
  async endFreeze(freezeId: number, dto: EndFreezeDto, centerId: number) {
    // Find freeze with enrollment validation
    const freeze = await this.prisma.studentFreeze.findFirst({
      where: {
        id: freezeId,
        isDeleted: false,
        enrollment: {
          group: {
            centerId,
            isDeleted: false,
          },
        },
      },
      include: {
        enrollment: {
          include: {
            group: true,
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
        },
      },
    });

    if (!freeze) {
      throw new NotFoundException('Freeze not found');
    }

    if (freeze.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot end freeze with status ${freeze.status}`,
      );
    }

    // End freeze and reactivate enrollment
    const result = await this.prisma.$transaction(async (tx) => {
      // Update freeze status
      const updatedFreeze = await tx.studentFreeze.update({
        where: { id: freezeId },
        data: {
          status: 'ENDED',
          actualEndDate: new Date(),
          endedBy: 'ADMIN',
        },
      });

      // Reactivate enrollment
      const updatedEnrollment = await tx.enrollment.update({
        where: { id: freeze.enrollmentId },
        data: {
          status: 'ACTIVE',
          // Balance remains unchanged - student continues with existing credit
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
                  telegramUserId: true,
                },
              },
            },
          },
        },
      });

      return { freeze: updatedFreeze, enrollment: updatedEnrollment };
    });

    this.logger.log(
      `Ended freeze ${freezeId} for enrollment ${freeze.enrollmentId}`,
    );

    // Send Telegram notification
    await this.telegramService.notifyStudentAboutFreeze(result, 'ENDED');

    return {
      success: true,
      code: 0,
      data: result,
      message: 'Freeze ended successfully',
    };
  }

  /**
   * Cancel a freeze (before it becomes active or during)
   */
  async cancelFreeze(freezeId: number, centerId: number) {
    const freeze = await this.prisma.studentFreeze.findFirst({
      where: {
        id: freezeId,
        isDeleted: false,
        enrollment: {
          group: {
            centerId,
            isDeleted: false,
          },
        },
      },
      include: {
        enrollment: true,
      },
    });

    if (!freeze) {
      throw new NotFoundException('Freeze not found');
    }

    if (freeze.status === 'ENDED' || freeze.status === 'CANCELLED') {
      throw new BadRequestException(
        `Cannot cancel freeze with status ${freeze.status}`,
      );
    }

    // Cancel freeze and reactivate if needed
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedFreeze = await tx.studentFreeze.update({
        where: { id: freezeId },
        data: {
          status: 'CANCELLED',
          actualEndDate: new Date(),
          endedBy: 'ADMIN',
        },
      });

      // If enrollment is frozen, reactivate it
      let updatedEnrollment = freeze.enrollment;
      if (freeze.enrollment.status === 'FROZEN') {
        updatedEnrollment = await tx.enrollment.update({
          where: { id: freeze.enrollmentId },
          data: { status: 'ACTIVE' },
        });
      }

      return { freeze: updatedFreeze, enrollment: updatedEnrollment };
    });

    this.logger.log(`Cancelled freeze ${freezeId}`);

    // Send Telegram notification
    await this.telegramService.notifyStudentAboutFreeze(result, 'CANCELLED');

    return {
      success: true,
      code: 0,
      data: result,
      message: 'Freeze cancelled successfully',
    };
  }

  /**
   * Get all freezes for an enrollment
   */
  async getFreezesByEnrollment(enrollmentId: number, centerId: number) {
    // Validate enrollment belongs to center
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        isDeleted: false,
        group: {
          centerId,
          isDeleted: false,
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const freezes = await this.prisma.studentFreeze.findMany({
      where: {
        enrollmentId,
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      code: 0,
      data: freezes,
      message: 'Freezes retrieved successfully',
    };
  }
}
