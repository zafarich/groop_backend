import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTeacherDto, UpdateTeacherDto, FilterTeachersDto } from './dto';
import * as bcrypt from 'bcrypt';
import { UserType } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a teacher with associated user account
   * Creates both User and Teacher records in a single transaction
   * Generates a unique bot link for teacher to connect their Telegram
   */
  async create(createTeacherDto: CreateTeacherDto, centerId: number) {
    const { firstName, lastName, phoneNumber, telegramUserId, specialty, bio } =
      createTeacherDto;

    // Check if center exists
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });

    if (!center) {
      throw new BadRequestException('Center not found');
    }

    // Check if phone number already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    // Generate random password (will be changed by teacher later)
    const randomPassword = this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Create user and teacher in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      let telegramUserDbId: number | null = null;

      // Only create/link TelegramUser if telegramUserId is provided
      if (telegramUserId) {
        // Find or create TelegramUser
        let telegramUser = await tx.telegramUser.findUnique({
          where: { telegramId: telegramUserId.toString() },
        });

        if (!telegramUser) {
          telegramUser = await tx.telegramUser.create({
            data: {
              telegramId: telegramUserId.toString(),
              firstName,
              lastName,
              phoneNumber,
              isBot: false,
              isActive: true,
            },
          });
        }

        // Check if this TelegramUser is already linked to another user
        const existingLinkedUser = await tx.user.findUnique({
          where: { telegramUserId: telegramUser.id },
        });

        if (existingLinkedUser) {
          throw new ConflictException(
            'This Telegram account is already linked to another user',
          );
        }

        telegramUserDbId = telegramUser.id;
      }

      // 2. Create user (with or without telegram link)
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          phoneNumber,
          password: hashedPassword,
          userType: UserType.TEACHER,
          authProvider: telegramUserId ? 'telegram' : 'local',
          telegramUserId: telegramUserDbId,
          botLinkToken: crypto.randomUUID(), // Generate unique token for bot linking
          centerId,
          activeCenterId: centerId,
          isActive: true,
          userCenters: {
            create: {
              centerId,
              role: UserType.TEACHER,
            },
          },
        },
      });

      // 3. Create teacher profile (with synced name fields)
      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
          centerId,
          firstName, // Sync from User
          lastName, // Sync from User
          specialty,
          bio,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              telegramUserId: true,
              userType: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
              telegramUser: {
                select: {
                  telegramId: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      return teacher;
    });

    return result;
  }

  /**
   * Get all teachers for a specific center with filtering and pagination
   */
  async findAll(centerId: number, filterDto: FilterTeachersDto) {
    const { search, page = 1, limit = 10 } = filterDto;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      centerId,
      isDeleted: false,
    };

    // Add search filter if provided
    if (search) {
      where.OR = [
        // Search by phone number
        {
          user: {
            phoneNumber: {
              contains: search,
            },
          },
        },
        // Search by first name
        {
          user: {
            firstName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        // Search by last name
        {
          user: {
            lastName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        // Search by telegram ID
        {
          user: {
            telegramUser: {
              telegramId: {
                contains: search,
              },
            },
          },
        },
      ];
    }

    // Get total count for pagination
    const total = await this.prisma.teacher.count({ where });

    // Get paginated teachers
    const teachers = await this.prisma.teacher.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            telegramUserId: true,
            userType: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            telegramUser: {
              select: {
                telegramId: true,
                username: true,
              },
            },
          },
        },
        groupTeachers: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
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
      data: teachers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single teacher by ID
   */
  async findOne(id: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            telegramUser: {
              select: {
                telegramId: true,
              },
            },
            userType: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        groupTeachers: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                courseStartDate: true,
                courseEndDate: true,
              },
            },
          },
        },
      },
    });

    if (!teacher || teacher.isDeleted) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher;
  }

  /**
   * Update teacher information
   * Syncs firstName/lastName between User and Teacher tables
   * Note: telegramUserId cannot be manually updated - only linked via bot
   */
  async update(id: number, updateTeacherDto: UpdateTeacherDto) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!teacher || teacher.isDeleted) {
      throw new NotFoundException('Teacher not found');
    }

    const { firstName, lastName, phoneNumber, specialty, bio, isActive } =
      updateTeacherDto;

    // Validate phone number uniqueness if changing
    if (phoneNumber && phoneNumber !== teacher.user.phoneNumber) {
      const existingUser = await this.prisma.user.findUnique({
        where: { phoneNumber },
      });
      if (existingUser) {
        throw new ConflictException('Phone number already registered');
      }
    }

    // Update in transaction to keep User and Teacher in sync
    const result = await this.prisma.$transaction(async (tx) => {
      // Update user
      await tx.user.update({
        where: { id: teacher.userId },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(phoneNumber !== undefined && { phoneNumber }),
        },
      });

      // Update teacher (including synced name fields)
      const updatedTeacher = await tx.teacher.update({
        where: { id },
        data: {
          ...(firstName !== undefined && { firstName }), // Sync from User
          ...(lastName !== undefined && { lastName }), // Sync from User
          ...(specialty !== undefined && { specialty }),
          ...(bio !== undefined && { bio }),
          ...(isActive !== undefined && { isActive }),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              telegramUser: {
                select: {
                  telegramId: true,
                  username: true,
                },
              },
              userType: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      return updatedTeacher;
    });

    return result;
  }

  /**
   * Soft delete a teacher and cascade to User and TelegramUser
   */
  async remove(id: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            telegramUser: true,
          },
        },
      },
    });

    if (!teacher || teacher.isDeleted) {
      throw new NotFoundException('Teacher not found');
    }

    // Soft delete teacher, user, and telegram user in a transaction
    await this.prisma.$transaction(async (tx) => {
      // 1. Soft delete teacher
      await tx.teacher.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      // 2. Soft delete associated user
      await tx.user.update({
        where: { id: teacher.userId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          isActive: false,
        },
      });

      // 3. Soft delete associated telegram user (if exists)
      if (teacher.user.telegramUser) {
        await tx.telegramUser.update({
          where: { id: teacher.user.telegramUser.id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            isActive: false,
          },
        });
      }
    });

    return { message: 'Teacher and associated accounts deleted successfully' };
  }

  /**
   * Generate a random password for initial teacher account
   * Teacher can change this later
   */
  private generateRandomPassword(): string {
    return crypto.randomBytes(8).toString('hex'); // 16 character random password
  }

  /**
   * Get Telegram bot link for teacher
   */
  async getBotLink(id: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!teacher || teacher.isDeleted) {
      throw new NotFoundException('Teacher not found');
    }

    // Get center's bot
    const bot = await this.prisma.centerTelegramBot.findFirst({
      where: { centerId: teacher.centerId },
    });

    if (!bot || !bot.isActive) {
      throw new BadRequestException(
        'Telegram bot not configured for this center',
      );
    }

    // Ensure user has a token
    let token = teacher.user.botLinkToken;
    if (!token) {
      token = crypto.randomUUID();
      await this.prisma.user.update({
        where: { id: teacher.userId },
        data: { botLinkToken: token },
      });
    }

    return {
      botLink: `https://t.me/${bot.botUsername}?start=${token}`,
    };
  }
}
