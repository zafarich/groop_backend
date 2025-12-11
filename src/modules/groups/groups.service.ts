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
import { CreateGroupDto, UpdateGroupDto, FilterGroupsDto } from './dto';
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

    return {
      success: true,
      code: 0,
      data: group,
      message: 'Group created successfully',
      setupInstructions: {
        message: 'Group created. To activate it, complete the following steps:',
        steps: [
          'Create a separate Telegram group for this course',
          'Add your bot to the Telegram group and grant it admin permissions',
          `Send the command /connect ${group.connectToken} to the Telegram group`,
          'Only after these steps are completed, the group becomes fully active.',
        ],
        connectToken: group.connectToken,
        tokenExpires: group.connectTokenExpires,
      },
    };
  }

  /**
   * Find all groups with filters and pagination
   */
  async findAll(centerId: number, filterDto: FilterGroupsDto) {
    const { search, status, page = 1, limit = 10 } = filterDto;
    const skip = (page - 1) * limit;

    const where: Prisma.GroupWhereInput = {
      centerId,
      isDeleted: false,
    };

    // Add status filter if provided
    if (status) {
      where.status = status as any;
    }

    // Add search filter if provided
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Get total count for pagination
    const total = await this.prisma.group.count({ where });

    // Get paginated groups
    const groups = await this.prisma.group.findMany({
      where,
      skip,
      take: limit,
      include: {
        groupDiscounts: {
          where: { isDeleted: false },
        },
        groupTeachers: {
          include: {
            teacher: true,
          },
        },
        lessonSchedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      code: 0,
      data: groups,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      message: 'Groups retrieved successfully',
    };
  }

  /**
   * Find one group by ID (internal use - returns raw group)
   */
  private async findOneRaw(id: number) {
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
   * Find one group by ID with complete details for group page
   */
  async findOne(id: number) {
    const group = await this.prisma.group.findUnique({
      where: { id, isDeleted: false },
      include: {
        groupTeachers: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                specialty: true,
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

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return {
      success: true,
      code: 0,
      data: group,
      message: 'Group retrieved successfully',
    };
  }

  /**
   * Update group basic information
   * Note: Teachers, schedules, and discounts should be updated through dedicated endpoints
   */
  async update(id: number, updateGroupDto: UpdateGroupDto) {
    // Check if group exists
    await this.findOneRaw(id);

    // Extract only the basic fields, excluding nested entities
    const {
      teachers: _teachers,
      lessonSchedules: _lessonSchedules,
      discounts: _discounts,
      ...basicFields
    } = updateGroupDto as any;

    const group = await this.prisma.group.update({
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

    return {
      success: true,
      code: 0,
      data: group,
      message: 'Group updated successfully',
    };
  }

  /**
   * Soft delete group
   */
  async remove(id: number) {
    await this.findOneRaw(id);

    await this.prisma.group.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      code: 0,
      data: null,
      message: 'Group deleted successfully',
    };
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

    // 4. Get bot username for join link generation
    const bot = await this.prisma.centerTelegramBot.findFirst({
      where: {
        centerId: group.centerId,
        isActive: true,
        isDeleted: false,
      },
    });

    if (!bot?.botUsername) {
      throw new BadRequestException(
        'Bot username not configured for this center. Please update bot settings.',
      );
    }

    // Generate join link for students
    const joinLink = `https://t.me/${bot.botUsername}?start=group_${group.id}`;
    this.logger.log(`Generated join link: ${joinLink}`);

    // 5. Update group in transaction (atomicity guaranteed)
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

      // Update the group with join link
      return tx.group.update({
        where: { id: group.id },
        data: {
          telegramGroupId: chatId,
          status: 'ACTIVE',
          joinLink, // Save join link for students
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
          updatedGroup.joinLink || '',
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
    const group = await this.findOneRaw(groupId);

    if (group.status === 'ACTIVE') {
      throw new BadRequestException(
        'Group is already connected. Cannot regenerate token for active groups.',
      );
    }

    const connectToken = uuidv4();
    const connectTokenExpires = new Date();
    connectTokenExpires.setDate(connectTokenExpires.getDate() + 7);

    const updated = await this.prisma.group.update({
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

    return {
      success: true,
      code: 0,
      data: {
        connectToken: updated.connectToken,
        connectTokenExpires: updated.connectTokenExpires,
      },
      message: 'Connection token regenerated successfully',
    };
  }

  /**
   * Get connection status for a group
   */
  async getConnectionStatus(id: number) {
    const group = await this.findOneRaw(id);

    return {
      success: true,
      code: 0,
      data: {
        groupId: group.id,
        status: group.status,
        isConnected: !!group.telegramGroupId,
        telegramGroupId: group.telegramGroupId,
        joinLink: group.joinLink,
        connectToken: group.status === 'PENDING' ? group.connectToken : null,
        connectTokenExpires:
          group.status === 'PENDING' ? group.connectTokenExpires : null,
        connectedAt: group.updatedAt,
      },
      message: 'Connection status retrieved successfully',
    };
  }

  /**
   * Update group teachers (replace all)
   */
  async updateTeachers(
    id: number,
    dto: import('./dto').UpdateGroupTeachersDto,
  ) {
    // 1. Validate group exists and get centerId
    const group = await this.findOneRaw(id);

    // 2. Validate teachers exist and belong to the same center
    const teacherIds = dto.teachers.map((t) => t.teacherId);
    const teachers = await this.prisma.teacher.findMany({
      where: {
        id: { in: teacherIds },
        centerId: group.centerId,
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

    // 3. Validate only one primary teacher
    const primaryTeachers = dto.teachers.filter((t) => t.isPrimary);
    if (primaryTeachers.length > 1) {
      throw new BadRequestException(
        'Only one teacher can be marked as primary.',
      );
    }

    // 4. Validate no duplicate teachers
    const uniqueTeacherIds = new Set(teacherIds);
    if (uniqueTeacherIds.size !== teacherIds.length) {
      throw new BadRequestException(
        'Duplicate teachers are not allowed. Each teacher can only be assigned once.',
      );
    }

    // 5. Replace all teachers in transaction
    const updatedGroup = await this.prisma.$transaction(async (tx) => {
      // Delete existing teachers
      await tx.groupTeacher.deleteMany({
        where: { groupId: id },
      });

      // Create new teachers
      await tx.groupTeacher.createMany({
        data: dto.teachers.map((t) => ({
          groupId: id,
          teacherId: t.teacherId,
          isPrimary: t.isPrimary || false,
        })),
      });

      // Return updated group with teachers
      return tx.group.findUnique({
        where: { id },
        include: {
          groupTeachers: {
            include: {
              teacher: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  specialty: true,
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
        },
      });
    });

    this.logger.log(
      `Updated teachers for group ${id}: ${dto.teachers.length} teacher(s)`,
    );

    return {
      success: true,
      code: 0,
      data: updatedGroup,
      message: 'Teachers updated successfully',
    };
  }

  /**
   * Update group lesson schedules (replace all)
   */
  async updateSchedules(
    id: number,
    dto: import('./dto').UpdateGroupSchedulesDto,
  ) {
    // 1. Validate group exists
    await this.findOneRaw(id);

    // 2. Validate no duplicate days
    const days = dto.schedules.map((s) => s.dayOfWeek);
    const uniqueDays = new Set(days);
    if (uniqueDays.size !== days.length) {
      throw new BadRequestException(
        'Duplicate lesson days are not allowed. Each day can only appear once.',
      );
    }

    // 3. Replace all schedules in transaction
    const updatedGroup = await this.prisma.$transaction(async (tx) => {
      // Delete existing schedules
      await tx.lessonSchedule.deleteMany({
        where: { groupId: id },
      });

      // Create new schedules
      await tx.lessonSchedule.createMany({
        data: dto.schedules.map((s) => ({
          groupId: id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });

      // Return updated group with schedules
      return tx.group.findUnique({
        where: { id },
        include: {
          lessonSchedules: {
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      });
    });

    this.logger.log(
      `Updated schedules for group ${id}: ${dto.schedules.length} schedule(s)`,
    );

    return {
      success: true,
      code: 0,
      data: updatedGroup,
      message: 'Schedules updated successfully',
    };
  }

  /**
   * Update group discounts (replace all)
   */
  async updateDiscounts(
    id: number,
    dto: import('./dto').UpdateGroupDiscountsDto,
  ) {
    // 1. Validate group exists
    await this.findOneRaw(id);

    // 2. Validate no duplicate months (if discounts provided)
    if (dto.discounts && dto.discounts.length > 0) {
      const months = dto.discounts.map((d) => d.months);
      const uniqueMonths = new Set(months);
      if (uniqueMonths.size !== months.length) {
        throw new BadRequestException(
          'Duplicate discount months are not allowed. Each month value can only appear once.',
        );
      }
    }

    // 3. Replace all discounts in transaction
    const updatedGroup = await this.prisma.$transaction(async (tx) => {
      // Soft delete existing discounts
      await tx.groupDiscount.updateMany({
        where: { groupId: id, isDeleted: false },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      // Create new discounts (if provided)
      if (dto.discounts && dto.discounts.length > 0) {
        await tx.groupDiscount.createMany({
          data: dto.discounts.map((d) => ({
            groupId: id,
            months: d.months,
            discountAmount: d.discountAmount,
          })),
        });
      }

      // Return updated group with discounts
      return tx.group.findUnique({
        where: { id },
        include: {
          groupDiscounts: {
            where: { isDeleted: false },
            orderBy: { months: 'asc' },
          },
        },
      });
    });

    this.logger.log(
      `Updated discounts for group ${id}: ${dto.discounts?.length || 0} discount(s)`,
    );

    return {
      success: true,
      code: 0,
      data: updatedGroup,
      message: 'Discounts updated successfully',
    };
  }
}
