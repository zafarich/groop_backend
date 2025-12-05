import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TelegramApiService } from '../center-bot/telegram-api.service';
import { BotPermissionsService } from './services/bot-permissions.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateGroupDto, UpdateGroupDto } from './dto';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    private prisma: PrismaService,
    private telegramApi: TelegramApiService,
    private botPermissions: BotPermissionsService,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * Create a new group with teachers, schedules, and discounts
   */
  async create(createGroupDto: CreateGroupDto, activeCenterId: number) {
    this.logger.log(
      `Creating new group: ${createGroupDto.name} for center ${activeCenterId}`,
    );

    // 1. Validate teachers exist and belong to the same center
    const teacherIds = createGroupDto.teachers.map((t) => t.teacherId);
    const teachers = await this.prisma.teacher.findMany({
      where: {
        id: { in: teacherIds },
        centerId: activeCenterId,
        isDeleted: false,
      },
    });

    if (teachers.length !== teacherIds.length) {
      const foundIds = teachers.map((t) => t.id);
      const missingIds = teacherIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Teachers not found or don't belong to this center: ${missingIds.join(', ')}`,
      );
    }

    // 2. Validate no duplicate lesson days
    const days = createGroupDto.lessonSchedules.map((s) => s.dayOfWeek);
    const uniqueDays = new Set(days);
    if (uniqueDays.size !== days.length) {
      throw new BadRequestException(
        'Duplicate lesson days are not allowed. Each day can only appear once.',
      );
    }

    // 3. Validate no duplicate discount months
    if (createGroupDto.discounts && createGroupDto.discounts.length > 0) {
      const months = createGroupDto.discounts.map((d) => d.months);
      const uniqueMonths = new Set(months);
      if (uniqueMonths.size !== months.length) {
        throw new BadRequestException(
          'Duplicate discount months are not allowed. Each month value can only appear once.',
        );
      }
    }

    // 4. Validate only one primary teacher
    const primaryTeachers = createGroupDto.teachers.filter((t) => t.isPrimary);
    if (primaryTeachers.length > 1) {
      throw new BadRequestException(
        'Only one teacher can be marked as primary.',
      );
    }

    // 5. Create group with all related entities in transaction
    const group = await this.prisma.$transaction(async (tx) => {
      // Generate connect token and expiration (7 days from now)
      const connectToken = uuidv4();
      const connectTokenExpires = new Date();
      connectTokenExpires.setDate(connectTokenExpires.getDate() + 7);

      // Create the group
      const newGroup = await tx.group.create({
        data: {
          centerId: activeCenterId,
          name: createGroupDto.name,
          description: createGroupDto.description,
          monthlyPrice: createGroupDto.monthlyPrice,
          courseStartDate: new Date(createGroupDto.courseStartDate),
          courseEndDate: new Date(createGroupDto.courseEndDate),
          paymentType: createGroupDto.paymentType,
          lessonsPerPaymentPeriod: createGroupDto.lessonsPerPaymentPeriod,
          status: 'PENDING', // Waiting for Telegram connection
          joinLink: null, // Will be generated after /connect
          connectToken,
          connectTokenExpires,
        },
      });

      // Create teacher assignments
      await tx.groupTeacher.createMany({
        data: createGroupDto.teachers.map((t) => ({
          groupId: newGroup.id,
          teacherId: t.teacherId,
          isPrimary: t.isPrimary || false,
        })),
      });

      // Create lesson schedules
      await tx.lessonSchedule.createMany({
        data: createGroupDto.lessonSchedules.map((s) => ({
          groupId: newGroup.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });

      // Create discounts (if provided)
      if (createGroupDto.discounts && createGroupDto.discounts.length > 0) {
        await tx.groupDiscount.createMany({
          data: createGroupDto.discounts.map((d) => ({
            groupId: newGroup.id,
            months: d.months,
            discountAmount: d.discountAmount,
          })),
        });
      }

      // Return group with all relations
      return tx.group.findUnique({
        where: { id: newGroup.id },
        include: {
          groupTeachers: {
            include: {
              teacher: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
          lessonSchedules: {
            orderBy: { dayOfWeek: 'asc' },
          },
          groupDiscounts: {
            where: { isDeleted: false },
            orderBy: { months: 'asc' },
          },
        },
      });
    });

    if (!group) {
      throw new Error('Failed to create group - transaction returned null');
    }

    this.logger.log(
      `Created group ${group.id} with ${createGroupDto.teachers.length} teacher(s), ` +
        `${createGroupDto.lessonSchedules.length} schedule(s), ` +
        `${createGroupDto.discounts?.length || 0} discount(s)`,
    );

    return group;
  }

  /**
   * Find all groups with filters
   */
  async findAll(centerId?: number, filters?: { status?: string }) {
    const where: Prisma.GroupWhereInput = {
      isDeleted: false,
    };

    if (centerId) {
      where.centerId = centerId;
    }

    if (filters?.status) {
      where.status = filters.status as any;
    }

    return this.prisma.group.findMany({
      where,
      include: {
        groupDiscounts: {
          where: { isDeleted: false },
        },
        groupTeachers: {
          include: {
            teacher: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find one group by ID
   */
  async findOne(id: number) {
    const group = await this.prisma.group.findUnique({
      where: { id, isDeleted: false },
      include: {
        groupDiscounts: {
          where: { isDeleted: false },
        },
        groupTeachers: {
          include: {
            teacher: true,
          },
        },
        enrollments: {
          where: { isDeleted: false },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return group;
  }

  /**
   * Update group basic information
   * Note: Teachers, schedules, and discounts should be updated through dedicated endpoints
   */
  async update(id: number, updateGroupDto: UpdateGroupDto) {
    // Check if group exists
    await this.findOne(id);

    // Extract only the basic fields, excluding nested entities
    const {
      teachers: _teachers,
      lessonSchedules: _lessonSchedules,
      discounts: _discounts,
      ...basicFields
    } = updateGroupDto as any;

    return this.prisma.group.update({
      where: { id },
      data: basicFields,
      include: {
        groupDiscounts: {
          where: { isDeleted: false },
        },
        groupTeachers: {
          include: {
            teacher: true,
          },
        },
        lessonSchedules: true,
      },
    });
  }

  /**
   * Soft delete group
   */
  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.group.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Main method to connect Telegram group via /connect command
   * @param connectToken - Secret connect token from group creation
   * @param chatId - Telegram group chat ID
   * @param botToken - Bot token for API calls
   * @returns Updated group with join link
   */
  async connectTelegramGroup(
    connectToken: string,
    chatId: string,
    botToken: string,
  ) {
    this.logger.log(
      `Attempting to connect Telegram group ${chatId} with token ${connectToken}`,
    );

    // 1. Find group by connectToken
    const group = await this.prisma.group.findUnique({
      where: { connectToken, isDeleted: false },
    });

    if (!group) {
      throw new NotFoundException('Token eskirgan yoki ishlatilgan');
    }

    // 2. Check token expiration
    if (group.connectTokenExpires && group.connectTokenExpires < new Date()) {
      throw new BadRequestException(
        'Token eskirgan yoki ishlatilgan. Iltimos, admin paneldan yangi token oling.',
      );
    }

    // 3. Check if this telegram group is already connected to another group
    const existingConnection = await this.prisma.group.findFirst({
      where: {
        telegramGroupId: chatId,
        isDeleted: false,
        NOT: { id: group.id },
      },
    });

    if (existingConnection) {
      throw new ConflictException(
        `Bu Telegram guruh biror bir guruhga bog'liq`,
      );
    }

    // 3. Check bot permissions (fail-fast)
    this.logger.log('Checking bot permissions...');
    const permissionCheck = await this.botPermissions.checkBotPermissions(
      botToken,
      chatId,
    );

    if (!permissionCheck.hasAllPermissions) {
      const errorMessage = this.botPermissions.generatePermissionErrorMessage(
        permissionCheck.missingPermissions,
      );
      throw new BadRequestException(errorMessage);
    }

    this.logger.log('✅ Bot has all required permissions');

    // 4. Update group in transaction (atomicity guaranteed)
    // Note: Join link will be generated later when student payment is approved
    const updatedGroup = await this.prisma.$transaction(async (tx) => {
      // Double-check telegram group ID uniqueness inside transaction
      const conflictCheck = await tx.group.findFirst({
        where: {
          telegramGroupId: chatId,
          isDeleted: false,
          NOT: { id: group.id },
        },
      });

      if (conflictCheck) {
        throw new ConflictException(
          'Telegram group was connected by another request',
        );
      }

      // Update the group (joinLink will be set later when student payment is approved)
      return tx.group.update({
        where: { id: group.id },
        data: {
          telegramGroupId: chatId,
          status: 'ACTIVE',
          connectToken: null, // Clear token after successful connection
          connectTokenExpires: null,
          updatedAt: new Date(),
        },
        include: {
          groupDiscounts: {
            where: { isDeleted: false },
          },
          groupTeachers: {
            include: {
              teacher: true,
            },
          },
        },
      });
    });

    this.logger.log(
      `✅ Group ${group.id} successfully connected to Telegram group ${chatId}`,
    );

    // 5. Emit WebSocket event to admin panel
    try {
      if (updatedGroup.telegramGroupId) {
        this.eventsGateway.emitGroupConnected(
          updatedGroup.centerId,
          updatedGroup.id,
          updatedGroup.joinLink || '', // joinLink will be null at this point
          updatedGroup.telegramGroupId,
        );
        this.logger.log(
          `✅ Emitted GROUP_CONNECTED event to center ${updatedGroup.centerId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to emit WebSocket event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't fail the entire operation if WebSocket fails
    }

    return updatedGroup;
  }

  /**
   * Find group by join link (used for webhooks)
   */
  async findByJoinLink(joinLink: string) {
    const group = await this.prisma.group.findUnique({
      where: { joinLink, isDeleted: false },
    });

    if (!group) {
      throw new NotFoundException('Group not found with this join link');
    }

    return group;
  }

  /**
   * Regenerate connect token for a group (if expired or lost)
   */
  async regenerateConnectToken(groupId: number) {
    const group = await this.findOne(groupId);

    if (group.status === 'ACTIVE') {
      throw new BadRequestException(
        'Group is already connected. Cannot regenerate token for active groups.',
      );
    }

    const connectToken = uuidv4();
    const connectTokenExpires = new Date();
    connectTokenExpires.setDate(connectTokenExpires.getDate() + 7);

    return this.prisma.group.update({
      where: { id: groupId },
      data: { connectToken, connectTokenExpires },
      select: {
        id: true,
        name: true,
        status: true,
        connectToken: true,
        connectTokenExpires: true,
      },
    });
  }

  /**
   * Get connection status for a group
   */
  async getConnectionStatus(id: number) {
    const group = await this.findOne(id);

    return {
      groupId: group.id,
      status: group.status,
      isConnected: !!group.telegramGroupId,
      telegramGroupId: group.telegramGroupId,
      joinLink: group.joinLink,
      connectToken: group.status === 'PENDING' ? group.connectToken : null,
      connectTokenExpires:
        group.status === 'PENDING' ? group.connectTokenExpires : null,
      connectedAt: group.updatedAt,
    };
  }
}
