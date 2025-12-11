import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TelegramApiService } from '../center-bot/telegram-api.service';
import { GroupsService } from '../groups/groups.service';
import {
  CreateTelegramUserDto,
  UpdateTelegramUserDto,
  TelegramWebhookUpdateDto,
} from './dto';
import {
  CenterTelegramBot,
  Center,
  TelegramUser,
  User,
  UserType,
  Prisma,
} from '@prisma/client';

// Telegram Bot API interfaces
interface TelegramBotWithCenter extends CenterTelegramBot {
  center: Center;
}

interface TelegramUserWithUser extends TelegramUser {
  user: User | null;
}

// Helper function to create user data, omitting username if empty
function buildUserData(data: {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber: string;
  centerId: number;
  userType: UserType;
  authProvider: string;
  telegramUserId: number;
  username?: string | null;
}): Prisma.UserCreateInput {
  const { username, centerId, telegramUserId, ...rest } = data;

  const userData: Prisma.UserCreateInput = {
    ...rest,
    center: { connect: { id: centerId } },
    telegramUser: { connect: { id: telegramUserId } },
  };

  // Only include username if it exists and is not empty
  if (username && username.trim() !== '') {
    userData.username = username;
  }

  return userData;
}

interface TelegramMessageFrom {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramMessageFrom;
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    width: number;
    height: number;
  }>;
  caption?: string;
  contact?: {
    phone_number: string;
    first_name?: string;
    last_name?: string;
    user_id?: number;
  };
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramMessageFrom;
  message: TelegramMessage;
  data: string;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private prisma: PrismaService,
    private telegramApi: TelegramApiService,
    @Inject(forwardRef(() => GroupsService))
    private groupsService: GroupsService,
  ) {}

  async createTelegramUser(createTelegramUserDto: CreateTelegramUserDto) {
    const { telegramId, centerId, createLinkedUser, ...rest } =
      createTelegramUserDto;

    // Check if telegram user already exists (globally unique now)
    const existingTelegramUser = await this.prisma.telegramUser.findUnique({
      where: { telegramId },
      include: { user: true },
    });

    if (existingTelegramUser) {
      throw new ConflictException('Telegram user already exists');
    }

    // Create TelegramUser
    const telegramUser = await this.prisma.telegramUser.create({
      data: {
        telegramId,
        centerId,
        ...rest,
      },
    });

    // Auto-create linked User if requested (for students)
    if (createLinkedUser && centerId && rest.phoneNumber) {
      const userData = buildUserData({
        firstName: rest.firstName,
        lastName: rest.lastName,
        phoneNumber: rest.phoneNumber,
        centerId,
        userType: UserType.STUDENT,
        authProvider: 'telegram',
        telegramUserId: telegramUser.id,
        username: rest.username,
      });

      this.logger.log(
        `Creating user with username: ${userData.username || 'NOT SET'}`,
      );

      const linkedUser = await this.prisma.user.create({
        data: userData,
      });

      this.logger.log(
        `Created linked User ${linkedUser.id} for TelegramUser ${telegramUser.id}`,
      );
    }

    return this.prisma.telegramUser.findUnique({
      where: { id: telegramUser.id },
      include: { user: true },
    });
  }

  async findAll() {
    return this.prisma.telegramUser.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const telegramUser = await this.prisma.telegramUser.findUnique({
      where: { id },
    });

    if (!telegramUser) {
      throw new NotFoundException('Telegram user not found');
    }

    return telegramUser;
  }

  async findByTelegramId(telegramId: string) {
    const telegramUser = await this.prisma.telegramUser.findUnique({
      where: { telegramId },
      include: { user: true },
    });

    if (!telegramUser) {
      throw new NotFoundException('Telegram user not found');
    }

    return telegramUser;
  }

  async update(id: number, updateTelegramUserDto: UpdateTelegramUserDto) {
    const telegramUser = await this.prisma.telegramUser.findUnique({
      where: { id },
    });

    if (!telegramUser) {
      throw new NotFoundException('Telegram user not found');
    }

    return this.prisma.telegramUser.update({
      where: { id },
      data: updateTelegramUserDto,
    });
  }

  async remove(id: number) {
    const telegramUser = await this.prisma.telegramUser.findUnique({
      where: { id },
    });

    if (!telegramUser) {
      throw new NotFoundException('Telegram user not found');
    }

    await this.prisma.telegramUser.delete({
      where: { id },
    });

    return { message: 'Telegram user deleted successfully' };
  }

  /**
   * Handle incoming webhook updates from Telegram (with bot context)
   */
  async handleWebhook(
    botId: string,
    secretToken: string,
    update: TelegramWebhookUpdateDto,
    headers: Record<string, string | string[] | undefined>,
  ) {
    this.logger.log(
      `Received webhook update ${update.update_id} for bot ${botId}`,
    );

    // Verify bot and secret token
    const bot = await this.prisma.centerTelegramBot.findFirst({
      where: {
        id: parseInt(botId, 10),
        secretToken,
        isActive: true,
      },
      include: {
        center: true,
      },
    });

    if (!bot) {
      this.logger.warn(`Invalid bot or secret token: ${botId}`);
      throw new UnauthorizedException('Invalid bot credentials');
    }

    // Verify Telegram secret (if set in env)
    const telegramSecret = headers['x-telegram-bot-api-secret-token'];
    const telegramSecretStr = Array.isArray(telegramSecret)
      ? telegramSecret[0]
      : telegramSecret;

    if (
      process.env.TELEGRAM_WEBHOOK_SECRET &&
      telegramSecretStr !== process.env.TELEGRAM_WEBHOOK_SECRET
    ) {
      this.logger.warn(`Invalid Telegram secret for bot ${botId}`);
      throw new UnauthorizedException('Invalid Telegram secret');
    }

    try {
      // Handle different types of updates
      if (update.message) {
        await this.handleMessage(
          bot,
          update.message as unknown as TelegramMessage,
        );
      }

      if (update.callback_query) {
        await this.handleCallbackQuery(
          bot,
          update.callback_query as unknown as TelegramCallbackQuery,
        );
      }

      return { ok: true };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error handling webhook: ${errorMessage}`);
      return { ok: false, error: errorMessage };
    }
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(
    bot: TelegramBotWithCenter,
    message: TelegramMessage,
  ) {
    this.logger.log(
      `Handling message from ${message.from.id} for center ${bot.center.name}`,
    );

    const telegramId = message.from.id.toString();
    const chatId = message.chat.id.toString();

    // Check if this is a private chat (direct bot usage) or group chat
    // Telegram group IDs are negative numbers
    const isPrivateChat = Number(chatId) > 0;

    // Upsert telegram user (globally unique by telegramId)
    let telegramUser: TelegramUserWithUser | null =
      await this.prisma.telegramUser.findUnique({
        where: { telegramId },
        include: { user: true },
      });

    if (!telegramUser) {
      // CASE 1: Telegram user doesn't exist - create new record

      if (isPrivateChat) {
        // For private chat: Create TelegramUser with only telegramId
        // No default phone number - will be filled during registration
        telegramUser = await this.prisma.telegramUser.create({
          data: {
            telegramId,
            centerId: bot.centerId,
            chatId,
            isBot: message.from.is_bot || false,
            status: 'active',
            userStep: 'share_contact', // Start registration flow
          },
          include: { user: true },
        });

        this.logger.log(
          `Created new TelegramUser ${telegramUser.id} for private chat, starting registration flow`,
        );

        // Check if it's a deep link start command (e.g., /start group_123)
        if (message.text && message.text.startsWith('/start ')) {
          const param = message.text.substring(7).trim();
          if (param) {
            this.logger.log(`New user started with param: ${param}`);
            await this.handleStartCommand(bot, telegramUser, param);
            return;
          }
        }

        // Show share contact button immediately
        await this.promptShareContact(bot, telegramUser);
        return;
      } else {
        // For group chat: Create minimal TelegramUser record for /connect command
        // Don't save chatId here to avoid overwriting private chatId
        if (message.text && message.text.startsWith('/connect')) {
          telegramUser = await this.prisma.telegramUser.create({
            data: {
              telegramId,
              centerId: bot.centerId,
              // chatId is intentionally NOT set here - will be set when user messages in private chat
              isBot: message.from.is_bot || false,
              status: 'active',
            },
            include: { user: true },
          });

          this.logger.log(
            `Created minimal TelegramUser ${telegramUser.id} for /connect in group chat`,
          );
        } else {
          // For other group messages: ignore
          this.logger.log(
            `Ignoring non-connect message from group chat for new user ${telegramId}`,
          );
          return;
        }
      }
    } else {
      // CASE 2: Telegram user already exists

      // Update chatId ONLY if this is a private chat and chatId has changed
      // This prevents overwriting private chatId with group chatId (negative numbers)
      if (isPrivateChat && telegramUser.chatId !== chatId) {
        telegramUser = (await this.prisma.telegramUser.update({
          where: { id: telegramUser.id },
          data: { chatId },
          include: { user: true },
        })) as TelegramUserWithUser;
      }

      // Auto-restore corrupted chatId: If user has group chatId but is messaging from private chat
      // This fixes chatIds that were overwritten when admin used /connect in group chat
      if (isPrivateChat && Number(telegramUser.chatId) < 0) {
        this.logger.warn(
          `User ${telegramUser.id} has group chatId ${telegramUser.chatId}, restoring to private chatId ${chatId}`,
        );

        telegramUser = (await this.prisma.telegramUser.update({
          where: { id: telegramUser.id },
          data: { chatId }, // Restore to private chat ID
          include: { user: true },
        })) as TelegramUserWithUser;

        this.logger.log(
          `Restored chatId for user ${telegramUser.id} to ${chatId}`,
        );
      }

      // For private chat: Check if registration flow needs to continue
      if (isPrivateChat) {
        // Check if user is in registration flow (has userStep set)
        if (telegramUser.userStep) {
          // User is in registration flow - continue from current step
          // Handle contact sharing
          if (message.contact) {
            await this.handleContactMessage(bot, telegramUser, message.contact);
            return;
          }

          // Handle text input for registration steps
          // Skip if waiting for rejection reason (handled in handleRegularMessage)
          if (
            message.text &&
            !message.text.startsWith('/') &&
            !telegramUser.userStep.startsWith('waiting_rejection_reason:')
          ) {
            await this.handleRegistrationStepInput(
              bot,
              telegramUser,
              message.text,
            );
            return;
          }

          // Handle /start during registration - restart flow
          if (message.text?.trim() === '/start') {
            await this.prisma.telegramUser.update({
              where: { id: telegramUser.id },
              data: { userStep: 'share_contact' },
            });
            await this.promptShareContact(bot, telegramUser);
            return;
          }
        }

        // Check if user has no linked User - needs to complete registration
        if (!telegramUser.user) {
          // No linked user - start/continue registration flow
          if (!telegramUser.userStep) {
            // Set userStep to start registration
            await this.prisma.telegramUser.update({
              where: { id: telegramUser.id },
              data: { userStep: 'share_contact' },
            });
          }

          // Handle contact sharing
          if (message.contact) {
            await this.handleContactMessage(bot, telegramUser, message.contact);
            return;
          }

          // Show share contact button for any message if not registered
          await this.promptShareContact(bot, telegramUser);
          return;
        }
      }
      // else {
      //   // For group chat: Do nothing - ignore group messages
      //   this.logger.log(
      //     `Ignoring message from group chat for existing user ${telegramId}`,
      //   );
      //   return;
      // }
    }

    // Ensure telegramUser is not null
    if (!telegramUser) {
      this.logger.error('TelegramUser is null after processing');
      return;
    }

    // Only process bot features in private chat
    // Group chat is only for /connect command (handled in processTextMessage)
    if (!isPrivateChat) {
      // For group chat: Only handle /connect command
      if (message.text && message.text.startsWith('/connect')) {
        // Pass the actual message chatId for group validation
        const [, token] = message.text.split(' ');
        await this.handleConnectCommand(bot, telegramUser, token, chatId);
      } else {
        this.logger.debug(
          `Ignoring non-connect message from group chat for user ${telegramId}`,
        );
      }
      return;
    }

    // Private chat only - handle all bot features
    // Handle contact sharing (fallback for any case)
    if (message.contact) {
      await this.handleContactMessage(bot, telegramUser, message.contact);
      return;
    }

    // Process message text
    if (message.text) {
      await this.processTextMessage(bot, telegramUser, message.text);
    }

    // Handle photo (payment receipt)
    if (message.photo) {
      await this.handlePhotoMessage(bot, telegramUser, message);
    }
  }

  /**
   * Prompt user to share their contact
   */
  private async promptShareContact(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
  ) {
    const welcomeMessage =
      `Assalomu alaykum! ${bot.center.name} o'quv markazi botiga xush kelibsiz! 👋\n\n` +
      `Ro'yxatdan o'tish uchun telefon raqamingizni ulashing.`;

    const keyboard = this.telegramApi.buildReplyKeyboard([
      [{ text: '📱 Telefon raqamni ulashish', request_contact: true }],
    ]);

    await this.sendMessageToUser(
      bot,
      telegramUser.chatId || '',
      welcomeMessage,
      { reply_markup: keyboard },
    );
  }

  /**
   * Handle text input during registration steps
   */
  private async handleRegistrationStepInput(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    text: string,
  ) {
    const currentStep = telegramUser.userStep;

    switch (currentStep) {
      case 'share_contact':
        // User sent text instead of sharing contact
        await this.sendMessageToUser(
          bot,
          telegramUser.chatId || '',
          'Iltimos, telefon raqamingizni ulashish uchun quyidagi tugmani bosing. 👇',
        );
        break;
      case 'input_first_name':
        await this.handleStartRegistrationFirstName(bot, telegramUser, text);
        break;
      case 'input_last_name':
        await this.handleStartRegistrationLastName(bot, telegramUser, text);
        break;
      default:
        this.logger.warn(`Unknown registration step: ${currentStep}`);
        break;
    }
  }

  /**
   * Handle callback queries (inline button clicks)
   */
  private async handleCallbackQuery(
    bot: TelegramBotWithCenter,
    callbackQuery: TelegramCallbackQuery,
  ) {
    this.logger.log(`Handling callback query: ${callbackQuery.data}`);

    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const telegramId = callbackQuery.from.id.toString();

    // Get telegram user
    const telegramUser = await this.prisma.telegramUser.findUnique({
      where: { telegramId },
      include: { user: true },
    });

    if (!telegramUser) {
      await this.telegramApi.answerCallbackQuery(
        bot.botToken,
        callbackQuery.id,
        'Xatolik: Foydalanuvchi topilmadi',
        true,
      );
      return;
    }

    // Parse callback data
    // Format: action:param1:param2
    const [action, ...params] = data.split(':');

    // For payment-related actions, don't answer callback query here
    // Let the handler do it with appropriate message
    const paymentActions = [
      'approve_payment',
      'reject_payment',
      'change_payment_decision',
    ];
    if (!paymentActions.includes(action)) {
      // Answer callback query immediately for non-payment actions
      await this.telegramApi.answerCallbackQuery(
        bot.botToken,
        callbackQuery.id,
        "Ma'lumot qabul qilindi",
      );
    }

    switch (action) {
      case 'pay':
        await this.handlePaymentCallback(
          bot,
          telegramUser as TelegramUserWithUser,
          chatId,
          params,
        );
        break;
      case 'trial':
        await this.handleTrialCallback(
          bot,
          telegramUser as TelegramUserWithUser,
          chatId,
          params,
        );
        break;
      case 'send_receipt':
        await this.handleSendReceiptButton(bot, chatId, params);
        break;
      case 'cancel_enrollment':
        await this.handleCancelEnrollment(bot, chatId, params);
        break;
      case 'approve_payment':
        await this.handleApprovePayment(
          bot,
          telegramUser as TelegramUserWithUser,
          params[0],
          callbackQuery,
        );
        break;
      case 'reject_payment':
        await this.handleRejectPayment(
          bot,
          telegramUser as TelegramUserWithUser,
          params[0],
          callbackQuery,
        );
        break;
      case 'change_payment_decision':
        await this.handleChangePaymentDecision(
          bot,
          telegramUser as TelegramUserWithUser,
          params[0],
          callbackQuery,
        );
        break;
      default:
        this.logger.warn(`Unknown callback action: ${action}`);
    }
  }

  /**
   * Handle payment callback (user selected payment option)
   */
  private async handlePaymentCallback(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    chatId: number,
    params: string[],
  ) {
    const groupId = parseInt(params[0], 10);
    const months = parseInt(params[1], 10);

    if (isNaN(groupId) || isNaN(months)) {
      await this.sendMessageToUser(bot, chatId, '❌ Xatolik yuz berdi.');
      return;
    }

    // Get group with discounts
    const group = await this.prisma.group.findUnique({
      where: { id: groupId, isDeleted: false },
      include: {
        groupDiscounts: {
          where: { isDeleted: false, months },
        },
      },
    });

    if (!group) {
      await this.sendMessageToUser(bot, chatId, '❌ Guruh topilmadi.');
      return;
    }

    // Calculate total amount
    const monthlyPrice = Number(group.monthlyPrice);
    let totalAmount = monthlyPrice * months;
    let discountAmount = 0;

    if (months > 1 && group.groupDiscounts.length > 0) {
      discountAmount = Number(group.groupDiscounts[0].discountAmount);
      totalAmount = monthlyPrice * months - discountAmount;
    }

    // Format price
    const formatPrice = (price: number) => {
      return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    // Save payment intent to StudentBotState
    await this.prisma.studentBotState.upsert({
      where: {
        telegramUserId_centerId: {
          telegramUserId: telegramUser.id,
          centerId: bot.centerId,
        },
      },
      update: {
        groupId,
        selectedMonths: months,
        currentStep: 'waiting_receipt',
        metadata: {
          amount: totalAmount,
          months: months,
          totalAmount,
          discountAmount,
          monthlyPrice,
        },
      },
      create: {
        telegramUserId: telegramUser.id,
        centerId: bot.centerId,
        groupId,
        selectedMonths: months,
        currentStep: 'waiting_receipt',
        metadata: {
          amount: totalAmount,
          months: months,
          totalAmount,
          discountAmount,
          monthlyPrice,
        },
      },
    });

    // Update telegram user step
    await this.prisma.telegramUser.update({
      where: { id: telegramUser.id },
      data: { userStep: 'waiting_receipt' },
    });

    // Get payment cards for the center
    const paymentCards = await this.prisma.centerPaymentCard.findMany({
      where: {
        centerId: bot.centerId,
        isActive: true,
        isVisible: true,
        isDeleted: false,
      },
      orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
    });

    let message = `💳 <b>To'lov ma'lumotlari</b>\n\n`;
    message += `📚 Guruh: ${group.name}\n`;
    message += `📅 Davr: ${months} oy\n`;
    message += `💰 Summa: <b>${formatPrice(totalAmount)} so'm</b>\n\n`;

    if (paymentCards.length > 0) {
      message += `<b>To'lov kartasi:</b>\n`;
      paymentCards.forEach((card) => {
        message += `💳 <code>${card.cardNumber}</code>\n`;
        message += `👤 ${card.cardHolder}\n`;
        if (card.bankName) {
          message += `🏦 ${card.bankName}\n`;
        }
        message += `\n`;
      });
    }

    message += `📸 <b>To'lovni amalga oshirgandan so'ng, chek rasmini yuboring.</b>`;

    await this.sendMessageToUser(bot, chatId, message, {
      parse_mode: 'HTML',
    });
  }

  /**
   * Handle trial lesson callback (user wants to join trial)
   */
  private async handleTrialCallback(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    chatId: number,
    params: string[],
  ) {
    const groupId = parseInt(params[0], 10);

    if (isNaN(groupId)) {
      await this.sendMessageToUser(bot, chatId, '❌ Xatolik yuz berdi.');
      return;
    }

    // Check if user is registered
    if (!telegramUser.user) {
      await this.sendMessageToUser(
        bot,
        chatId,
        "❌ Sinov darsida qatnashish uchun avval ro'yxatdan o'tishingiz kerak.",
      );
      return;
    }

    // Get group
    const group = await this.prisma.group.findUnique({
      where: { id: groupId, isDeleted: false, status: 'ACTIVE' },
    });

    if (!group) {
      await this.sendMessageToUser(bot, chatId, '❌ Guruh topilmadi.');
      return;
    }

    if (!group.telegramGroupId) {
      await this.sendMessageToUser(
        bot,
        chatId,
        '❌ Bu guruh hali Telegram guruhga ulanmagan.',
      );
      return;
    }

    // Get student record
    const student = await this.prisma.student.findFirst({
      where: { userId: telegramUser.user.id, isDeleted: false },
    });

    if (!student) {
      await this.sendMessageToUser(
        bot,
        chatId,
        "❌ Talaba ma'lumotlari topilmadi.",
      );
      return;
    }

    // Check if already enrolled
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        groupId_studentId: {
          groupId: group.id,
          studentId: student.id,
        },
      },
    });

    if (existingEnrollment && existingEnrollment.status === 'ACTIVE') {
      await this.sendMessageToUser(
        bot,
        chatId,
        "✅ Siz bu guruhda allaqachon faol a'zosiz!",
      );
      return;
    }

    if (existingEnrollment && existingEnrollment.status === 'TRIAL') {
      await this.sendMessageToUser(
        bot,
        chatId,
        '✅ Siz allaqachon sinov darsida qatnashyapsiz!',
      );
      return;
    }

    try {
      // Create one-time invite link for the Telegram group
      const inviteLinkResponse = await this.telegramApi.createChatInviteLink(
        bot.botToken,
        group.telegramGroupId,
        {
          member_limit: 1, // One-time use
          name: `Trial: ${telegramUser.user.firstName || 'Student'}`,
        },
      );

      const result = inviteLinkResponse.result as
        | { invite_link?: string }
        | undefined;
      if (!inviteLinkResponse.ok || !result?.invite_link) {
        this.logger.error(
          `Failed to create invite link: ${JSON.stringify(inviteLinkResponse)}`,
        );
        throw new Error('Failed to create invite link');
      }

      const inviteLink: string = result.invite_link;

      // Create or update enrollment with TRIAL status
      await this.prisma.enrollment.upsert({
        where: {
          groupId_studentId: {
            groupId: group.id,
            studentId: student.id,
          },
        },
        create: {
          groupId: group.id,
          studentId: student.id,
          status: 'TRIAL',
          joinedAt: new Date(),
          baseLessonPrice: group.monthlyPrice,
          perLessonPrice: group.monthlyPrice,
        },
        update: {
          status: 'TRIAL',
        },
      });

      this.logger.log(
        `Created trial enrollment for student ${student.id} in group ${group.id}`,
      );

      // Send invite link to user
      let message = `🎓 <b>Sinov darsiga xush kelibsiz!</b>\n\n`;
      message += `📚 Guruh: ${group.name}\n\n`;
      message += `Quyidagi havola orqali Telegram guruhga qo'shiling:\n`;
      message += `👉 ${inviteLink}\n\n`;
      message += `<i>⚠️ Bu havola faqat 1 marta ishlaydi.</i>`;

      await this.sendMessageToUser(bot, chatId, message, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      this.logger.error(`Error creating trial enrollment: ${error}`);
      await this.sendMessageToUser(
        bot,
        chatId,
        "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
      );
    }
  }

  /**
   * Process text messages
   */
  private async processTextMessage(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    text: string,
  ) {
    this.logger.log(`Processing text message: ${text}`);

    // Handle commands
    if (text.startsWith('/')) {
      const [command, ...params] = text.split(' ');

      switch (command.toLowerCase()) {
        case '/start':
          await this.handleStartCommand(bot, telegramUser, params[0]);
          break;
        case '/connect':
          await this.handleConnectCommand(bot, telegramUser, params[0]);
          break;
        case '/help':
          await this.handleHelpCommand(bot, telegramUser);
          break;
        case '/menu':
          await this.handleMenuCommand(bot, telegramUser);
          break;
        default:
          await this.sendMessageToUser(
            bot,
            telegramUser.chatId || '',
            "Noma'lum buyruq. /help ni bosing.",
          );
      }
    } else {
      // Handle regular messages (possible user inputs for enrollment flow)
      await this.handleRegularMessage(bot, telegramUser, text);
    }
  }

  /**
   * Handle group enrollment from deep link
   */
  private async handleGroupJoin(
    bot: TelegramBotWithCenter,
    telegramUserWithUser: TelegramUserWithUser,
    groupId: number,
  ) {
    this.logger.log(
      `handleGroupJoin request for user ${telegramUserWithUser.id} group ${groupId}`,
    );

    // 1. Find group
    const group = await this.prisma.group.findUnique({
      where: {
        id: groupId,
        centerId: bot.centerId,
        isDeleted: false,
      },
      include: {
        groupDiscounts: {
          where: { isDeleted: false },
          orderBy: { months: 'asc' },
        },
      },
    });

    if (!group || group.status !== 'ACTIVE') {
      await this.sendMessageToUser(
        bot,
        telegramUserWithUser.chatId || '',
        '❌ Guruh topilmadi yoki faol emas.',
      );
      return;
    }

    // 2. If user is registered, create enrollment (lead) and show info
    if (telegramUserWithUser.user) {
      this.logger.log(
        `User ${telegramUserWithUser.id} is registered, showing group info`,
      );
      // Create or update enrollment
      await this.prisma.enrollment.upsert({
        where: {
          groupId_studentId: {
            groupId: group.id,
            studentId:
              (
                await this.prisma.student.findFirst({
                  where: { userId: telegramUserWithUser.user.id },
                })
              )?.id || 0, // Should always exist for registered users
          },
        },
        create: {
          groupId: group.id,
          studentId: (
            await this.prisma.student.findFirstOrThrow({
              where: { userId: telegramUserWithUser.user.id },
            })
          ).id,
          status: 'LEAD', // Initial status for bot joiners
          joinedAt: new Date(),
          // Initialize prices (required fields)
          baseLessonPrice: group.monthlyPrice, // Default to monthly price for now
          perLessonPrice: group.monthlyPrice, // Default to monthly price for now
        },
        update: {}, // Already enrolled, just show info
      });

      await this.showGroupInfoWithPayments(bot, telegramUserWithUser, group);
    } else {
      this.logger.log(
        `User ${telegramUserWithUser.id} NOT registered, saving intent to StudentBotState`,
      );

      // 3. User not registered - save intent and start registration
      // Save intent to StudentBotState
      await this.prisma.studentBotState.upsert({
        where: {
          telegramUserId_centerId: {
            telegramUserId: telegramUserWithUser.id,
            centerId: bot.centerId,
          },
        },
        update: {
          groupId: group.id,
          currentStep: 'share_contact',
        },
        create: {
          telegramUserId: telegramUserWithUser.id,
          centerId: bot.centerId,
          groupId: group.id,
          currentStep: 'share_contact',
        },
      });

      await this.prisma.telegramUser.update({
        where: { id: telegramUserWithUser.id },
        data: {
          userStep: 'share_contact',
        },
      });

      const welcomeMessage =
        `Assalomu alaykum! ${bot.center.name} o'quv markazi botiga xush kelibsiz! 👋\n\n` +
        `"${group.name}" guruhiga yozilish uchun avval ro'yxatdan o'tishingiz kerak.\n` +
        `Iltimos, telefon raqamingizni ulashing.`;

      const keyboard = this.telegramApi.buildReplyKeyboard([
        [{ text: '📱 Telefon raqamni ulashish', request_contact: true }],
      ]);

      await this.sendMessageToUser(
        bot,
        telegramUserWithUser.chatId || '',
        welcomeMessage,
        { reply_markup: keyboard },
      );
    }
  }

  /**
   * Show group info and payment options
   */
  private async showGroupInfoWithPayments(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    group: any,
  ) {
    // Get teachers for the group
    const groupTeachers = await this.prisma.groupTeacher.findMany({
      where: { groupId: group.id },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Get lesson schedules
    const schedules = await this.prisma.lessonSchedule.findMany({
      where: { groupId: group.id },
      orderBy: { dayOfWeek: 'asc' },
    });

    // Format price with spaces for thousands
    const formatPrice = (price: number) => {
      return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    // Build message
    let message = `📚 <b>${group.name}</b>\n\n`;

    if (group.description) {
      message += `${group.description}\n\n`;
    }

    // Price
    message += `💰 <b>Narxi:</b> ${formatPrice(parseInt(group.monthlyPrice))} so'm\n`;

    // Course start date
    if (group.courseStartDate) {
      const startDate = new Date(group.courseStartDate);
      const formattedDate = startDate.toLocaleDateString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      message += `📅 <b>Boshlanish vaqti:</b> ${formattedDate}\n`;
    }

    // Teachers
    if (groupTeachers.length > 0) {
      const teacherNames = groupTeachers.map((gt) => {
        const t = gt.teacher;
        const firstName = t.firstName || t.user?.firstName || '';
        const lastName = t.lastName || t.user?.lastName || '';
        return `${firstName} ${lastName}`.trim();
      });
      message += `👨‍🏫 <b>O'qituvchi${groupTeachers.length > 1 ? 'lar' : ''}:</b> ${teacherNames.join(', ')}\n`;
    }

    // Lesson schedule in compact format (Du - 10:00, Chor - 12:00, ...)
    if (schedules.length > 0) {
      const dayNames: { [key: number]: string } = {
        1: 'Du',
        2: 'Se',
        3: 'Chor',
        4: 'Pay',
        5: 'Jum',
        6: 'Shan',
        7: 'Yak',
      };
      const scheduleStr = schedules
        .map((s) => `${dayNames[s.dayOfWeek]} - ${s.startTime}`)
        .join(', ');
      message += `🕐 <b>Dars vaqti:</b> ${scheduleStr}\n`;
    }

    message += `\n<b>To'lov turini tanlang:</b> 👇`;

    // Build buttons
    const buttons: any[] = [];

    // Monthly payment button
    buttons.push([
      {
        text: `💳 1 oyga to'lash - ${formatPrice(parseInt(group.monthlyPrice))} so'm`,
        callback_data: `pay:${group.id}:1`,
      },
    ]);

    // Multi-month discount buttons
    if (group.groupDiscounts && group.groupDiscounts.length > 0) {
      group.groupDiscounts.forEach((discount: any) => {
        const months = discount.months;
        const total =
          Number(group.monthlyPrice) * months - Number(discount.discountAmount);
        buttons.push([
          {
            text: `💳 ${months} oyga to'lash - ${formatPrice(total)} so'm`,
            callback_data: `pay:${group.id}:${months}`,
          },
        ]);
      });
    }

    // Trial lesson button
    buttons.push([
      {
        text: `🎓 Sinov darsida qatnashish`,
        callback_data: `trial:${group.id}`,
      },
    ]);

    await this.sendMessageToUser(bot, telegramUser.chatId || '', message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  }

  /**
   * Handle last name input (for /start registration flow)
   * Creates User and Student records upon completion
   */
  private async handleStartRegistrationLastName(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    text: string,
  ) {
    const lastName = text.trim();

    if (lastName.length < 2) {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        "❌ Iltimos, familiyangizni to'liq kiriting (kamida 2 harf).",
      );
      return;
    }

    // Reload telegramUser to get latest phoneNumber and firstName
    const freshTelegramUser = await this.prisma.telegramUser.findUnique({
      where: { id: telegramUser.id },
    });

    if (!freshTelegramUser || !freshTelegramUser.phoneNumber) {
      this.logger.error(
        `TelegramUser ${telegramUser.id} missing phone number for registration`,
      );
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        "❌ Xatolik yuz berdi. Iltimos, /start buyrug'ini qayta yuboring.",
      );
      return;
    }

    // Generate random password
    const password = this.generateRandomPassword();
    let newUser: any;

    try {
      // Create new User and Student in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Create User with STUDENT role
        newUser = await tx.user.create({
          data: {
            firstName: freshTelegramUser.firstName || '',
            lastName,
            phoneNumber: freshTelegramUser.phoneNumber as string,
            password, // In production, should be hashed
            userType: 'STUDENT', // Assuming UserType is an enum or string literal
            authProvider: 'telegram',
            centerId: bot.centerId,
            telegramUserId: telegramUser.id,
          },
        });

        // Create Student record
        await tx.student.create({
          data: {
            userId: newUser.id,
            centerId: bot.centerId,
            firstName: freshTelegramUser.firstName || '',
            lastName,
          },
        });

        // Clear the userStep and update lastName
        await tx.telegramUser.update({
          where: { id: telegramUser.id },
          data: {
            lastName,
            userStep: null,
          },
        });

        this.logger.log(
          `Created User ${newUser.id} and Student for TelegramUser ${telegramUser.id}`,
        );
      });

      // Check for pending group join
      this.logger.log(
        `Checking pending group join for user ${telegramUser.id} center ${bot.centerId}`,
      );

      // Check for pending group join
      this.logger.log(
        `Checking matching pending group join for user ${telegramUser.id}`,
      );

      // Check StudentBotState for pending group
      const botState = await this.prisma.studentBotState.findUnique({
        where: {
          telegramUserId_centerId: {
            telegramUserId: telegramUser.id,
            centerId: bot.centerId,
          },
        },
      });

      if (botState && botState.groupId) {
        this.logger.log(
          `Pending group join found in StudentBotState: ${botState.groupId}`,
        );

        // User had intent to join a group - redirect to group info
        await this.sendMessageToUser(
          bot,
          telegramUser.chatId || '',
          `✅ Ro'yxatdan o'tish muvaffaqiyatli yakunlandi!`,
        );

        // Pass fresh user object to handleGroupJoin
        const fullTelegramUser = {
          ...freshTelegramUser,
          user: newUser,
        } as unknown as TelegramUserWithUser;

        await this.handleGroupJoin(bot, fullTelegramUser, botState.groupId);
        return;
      }

      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        `✅ Ro'yxatdan o'tdingiz!\n\n` +
          `👤 Ism: ${freshTelegramUser.firstName} ${lastName}\n` +
          `📱 Telefon: ${freshTelegramUser.phoneNumber}\n\n` +
          `Kurslarimiz haqida ma'lumot olish uchun /menu buyrug'ini yuboring.`,
      );
    } catch (error) {
      this.logger.error(`Error creating user: ${error}`);
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        "❌ Ro'yxatdan o'tishda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring.",
      );
    }
  }

  /**
   * Handle course enrollment from link
   */
  private async handleCourseEnrollment(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    courseToken: string,
  ) {
    this.logger.log(
      `User ${telegramUser.telegramId} trying to enroll in course ${courseToken}`,
    );

    // Mock response for now as we focus on Group Join
    await this.sendMessageToUser(
      bot,
      telegramUser.chatId || '',
      `📚 Kurs bo'yicha ma'lumot olish (Tez orada...)`,
    );
  }

  /**
   * Handle /help command
   */
  private async handleHelpCommand(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
  ) {
    const helpText =
      `<b>Yordam:</b>\n\n` +
      `/start - Botni ishga tushirish\n` +
      `/menu - Kurslar ro'yxati\n` +
      `/help - Yordam\n\n` +
      `Savollar bo'lsa, bizga murojaat qiling: ${bot.center.name}`;

    await this.sendMessageToUser(bot, telegramUser.chatId || '', helpText, {
      parse_mode: 'HTML',
    });
  }

  /**
   * Handle /menu command
   */
  private async handleMenuCommand(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
  ) {
    const menuText =
      `<b>${bot.center.name}</b>\n\n` +
      `<b>Mavjud kurslar:</b>\n\n` +
      `📚 Hozircha kurslar mavjud emas.\n\n` +
      `Tez orada yangi kurslar qo'shiladi!`;

    await this.sendMessageToUser(bot, telegramUser.chatId || '', menuText, {
      parse_mode: 'HTML',
    });
  }
  /**
   * Handle /start command
   */
  private async handleStartCommand(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    param?: string,
  ) {
    // Parse start parameter (e.g., /start course_ABC123 or /start UUID)
    this.logger.log('PARAM', param);
    if (param) {
      // Handle group join link: /start group_<id>
      if (param.startsWith('group_')) {
        const groupId = parseInt(param.replace('group_', ''), 10);
        this.logger.log('groupId', groupId);
        if (!isNaN(groupId)) {
          await this.handleGroupJoin(bot, telegramUser, groupId);
          return;
        }
      }

      if (param.startsWith('course_')) {
        const courseToken = param.replace('course_', '');
        await this.handleCourseEnrollment(bot, telegramUser, courseToken);
        return;
      }

      // Check if it's a teacher linking token (UUID)
      // UUID regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(param)) {
        await this.handleTeacherLinking(bot, telegramUser, param);
        return;
      }
    }

    // Direct /start (no params) - Start registration flow
    // Check if user already has a linked User (registration complete)
    if (telegramUser.user) {
      // Already registered, show welcome message
      const welcomeMessage =
        bot.welcomeMessage ||
        `Assalomu alaykum, ${telegramUser.user.firstName || 'hurmatli foydalanuvchi'}! 👋\n\n` +
          `${bot.center.name} o'quv markazi botiga xush kelibsiz!\n` +
          `Kurslarimiz haqida ma'lumot olish uchun /menu buyrug'ini yuboring.`;

      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        welcomeMessage,
      );
      return;
    }

    // Start registration flow - set step to share_contact
    await this.prisma.telegramUser.update({
      where: { id: telegramUser.id },
      data: { userStep: 'share_contact' },
    });

    // Send welcome message with contact request button
    const welcomeMessage =
      `Assalomu alaykum! ${bot.center.name} o'quv markazi botiga xush kelibsiz! 👋\n\n` +
      `Ro'yxatdan o'tish uchun telefon raqamingizni ulashing.`;

    const keyboard = this.telegramApi.buildReplyKeyboard([
      [{ text: '📱 Telefon raqamni ulashish', request_contact: true }],
    ]);

    await this.sendMessageToUser(
      bot,
      telegramUser.chatId || '',
      welcomeMessage,
      { reply_markup: keyboard },
    );
  }

  /**
   * Handle /connect command (group chat only, admin only)
   */
  private async handleConnectCommand(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    token?: string,
    messageChatId?: string, // Actual chat ID from message
  ) {
    this.logger.log(
      `/connect command from ${telegramUser.telegramId} with token: ${token}`,
    );

    // Use messageChatId if provided (from group chat), otherwise use telegramUser.chatId (from private chat)
    const chatId = messageChatId || telegramUser.chatId || '';
    const chatIdNum = Number(chatId);

    // 1. Validate this is a group chat (not private)
    // Telegram group IDs are negative numbers
    if (chatIdNum >= 0) {
      await this.sendMessageToUser(
        bot,
        chatId,
        "❌ Bu buyruq faqat guruh chatida ishlatiladi! Iltimos, botni guruhga qo'shing va u yerda /connect buyrug'ini ishga tushiring.",
      );
      return;
    }

    // 2. Validate token provided
    if (!token || token.trim() === '') {
      await this.sendMessageToUser(
        bot,
        chatId,
        '❌ Token kiritilmagan!\n\nFoydalanish: `/connect <connect_token>`\n\nAdmin paneldan connect token ni oling.',
      );
      return;
    }

    try {
      // 3. Call GroupsService to connect with token
      const result = await this.groupsService.connectTelegramGroup(
        token, // Pass connectToken directly
        chatId.toString(),
        bot.botToken,
      );

      // 4. Send success message (join link will be sent to students after payment approval)
      await this.sendMessageToUser(
        bot,
        chatId,
        `✅ Muvaffaqiyatli ulandi!\n\n` +
          `📚 Guruh: ${result.name}\n\n` +
          `Telegram guruh tizim guruhiga muvaffaqiyatli bog'landi.`,
      );

      this.logger.log(
        `Successfully connected group ${result.id} to Telegram chat ${chatId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error connecting group: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // Send error message to group
      const errorMessage =
        error instanceof Error ? error.message : "Noma'lum xatolik yuz berdi.";

      await this.sendMessageToUser(bot, chatId, `❌ Xatolik: ${errorMessage}`);
    }
  }

  /**
   * Handle teacher linking via deep link
   */
  private async handleTeacherLinking(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    token: string,
  ) {
    this.logger.log(
      `Handling teacher linking for token ${token} and telegram user ${telegramUser.id}`,
    );

    // Find user with this token
    const targetUser = await this.prisma.user.findUnique({
      where: { botLinkToken: token },
      include: { teachers: true }, // Include teachers relation (it's an array)
    });

    if (!targetUser) {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        "❌ Havola eskirgan yoki noto'g'ri.",
      );
      return;
    }

    // Check if user is already linked to THIS telegram user
    if (targetUser.telegramUserId === telegramUser.id) {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        '✅ Siz allaqachon ushbu profilga ulangansiz.',
      );
      return;
    }

    // Link telegram user to this user
    await this.prisma.$transaction(async (tx) => {
      // 1. If telegramUser is already linked to another user, unlink it
      // (This handles the case where a student account was auto-created)
      if (telegramUser.user && telegramUser.user.id !== targetUser.id) {
        await tx.user.update({
          where: { id: telegramUser.user.id },
          data: { telegramUserId: null },
        });
        this.logger.log(
          `Unlinked TelegramUser ${telegramUser.id} from old User ${telegramUser.user.id}`,
        );
      }

      // 2. Update target user: clear token, set telegramUserId
      await tx.user.update({
        where: { id: targetUser.id },
        data: {
          botLinkToken: null, // Clear token (one-time use)
          telegramUserId: telegramUser.id,
        },
      });
    });

    await this.sendMessageToUser(
      bot,
      telegramUser.chatId || '',
      `✅ Muvaffaqiyatli ulandi!\n\n` +
        `Siz allaqachon tizimda ro'yxatdan o'tgansiz.\n` +
        `Telegram hisobingiz profilingizga ulandi.\n\n` +
        `/menu - Kurslarni ko'rish`,
      { reply_markup: this.telegramApi.buildRemoveKeyboard() },
    );
    return;
  }

  /**
   * Handle contact message (for /start registration flow)
   */
  private async handleContactMessage(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    contact: NonNullable<TelegramMessage['contact']>,
  ) {
    this.logger.log(
      `Contact shared by ${telegramUser.telegramId}: ${contact.phone_number}`,
    );

    // Check if user is in the correct step
    if (telegramUser.userStep !== 'share_contact') {
      this.logger.debug(
        `User ${telegramUser.telegramId} shared contact but not in share_contact step`,
      );
      return;
    }

    // Format phone number to 998901234567 format (no + sign)
    let phoneNumber = contact.phone_number;
    // Remove all non-digit characters (including +)
    phoneNumber = phoneNumber.replace(/\D/g, '');
    // Ensure it starts with country code (if it doesn't, add 998)
    if (!phoneNumber.startsWith('998')) {
      phoneNumber = '998' + phoneNumber;
    }

    // Check if a User with this phone number already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        phoneNumber,
        isDeleted: false,
      },
    });

    if (existingUser) {
      // Link existing user to this telegram user immediately
      this.logger.log(
        `Found existing user ${existingUser.id} with phone ${phoneNumber}, linking to TelegramUser ${telegramUser.id}`,
      );

      await this.prisma.$transaction(async (tx) => {
        // Link the existing user to this telegram user
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            telegramUserId: telegramUser.id,
            authProvider: 'telegram',
          },
        });

        // Update TelegramUser with phone number and clear userStep
        await tx.telegramUser.update({
          where: { id: telegramUser.id },
          data: {
            phoneNumber,
            firstName: existingUser.firstName || telegramUser.firstName,
            lastName: existingUser.lastName || telegramUser.lastName,
            userStep: null,
          },
        });
      });

      // Check for pending group join
      this.logger.log(
        `Checking pending group join for existing user ${telegramUser.id}`,
      );

      // Check StudentBotState for pending group
      const botState = await this.prisma.studentBotState.findUnique({
        where: {
          telegramUserId_centerId: {
            telegramUserId: telegramUser.id,
            centerId: bot.centerId,
          },
        },
      });

      if (botState && botState.groupId) {
        await this.sendMessageToUser(
          bot,
          telegramUser.chatId || '',
          `✅ Muvaffaqiyatli ulandi!`,
        );

        // Pass complete user object
        const fullTelegramUser = { ...telegramUser, user: existingUser } as any;

        await this.handleGroupJoin(bot, fullTelegramUser, botState.groupId);
        return;
      }

      // Send success message
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        `✅ Muvaffaqiyatli ulandi!\n\n` +
          `Siz allaqachon tizimda ro'yxatdan o'tgansiz.\n` +
          `Telegram hisobingiz profilingizga ulandi.\n\n` +
          `/menu - Kurslarni ko'rish`,
        { reply_markup: this.telegramApi.buildRemoveKeyboard() },
      );
      return;
    }

    // No existing user found, continue with registration flow
    // Update TelegramUser with phone number and advance to next step
    await this.prisma.telegramUser.update({
      where: { id: telegramUser.id },
      data: {
        phoneNumber,
        userStep: 'input_first_name',
      },
    });

    // Remove the keyboard and ask for first name
    await this.sendMessageToUser(
      bot,
      telegramUser.chatId || '',
      `✅ Telefon raqam qabul qilindi: ${phoneNumber}\n\nEndi ismingizni kiriting:`,
      { reply_markup: this.telegramApi.buildRemoveKeyboard() },
    );
  }

  /**
   * Handle first name input (for /start registration flow)
   */
  private async handleStartRegistrationFirstName(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    text: string,
  ) {
    const firstName = text.trim();

    if (firstName.length < 2) {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        "❌ Iltimos, ismingizni to'liq kiriting (kamida 2 harf).",
      );
      return;
    }

    // Update TelegramUser with first name and advance to last name step
    await this.prisma.telegramUser.update({
      where: { id: telegramUser.id },
      data: {
        firstName,
        userStep: 'input_last_name',
      },
    });

    await this.sendMessageToUser(
      bot,
      telegramUser.chatId || '',
      `✅ Rahmat, ${firstName}!\n\nEndi familiyangizni kiriting:`,
    );
  }

  /**
   * Generate a random password for new users
   */
  private generateRandomPassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Handle regular text messages based on user state
   */
  private async handleRegularMessage(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    text: string,
  ) {
    this.logger.log(
      `Regular message from ${telegramUser.telegramId}: ${text}, current step: ${telegramUser.userStep}`,
    );

    // Check user's current step in enrollment flow
    const currentStep = telegramUser.userStep;

    if (!currentStep) {
      // No active enrollment, ignore or show help
      this.logger.debug(`No active step for user ${telegramUser.telegramId}`);
      return;
    }

    // Check if admin is entering rejection reason
    if (currentStep.startsWith('waiting_rejection_reason:')) {
      const parts = currentStep.split(':');
      const paymentId = parts[1];
      const messageId = parts[2] ? parseInt(parts[2], 10) : undefined;
      const chatId = parts[3] ? parseInt(parts[3], 10) : undefined;
      await this.handleRejectionReasonInput(
        bot,
        telegramUser,
        text,
        paymentId,
        messageId,
        chatId,
      );
      return;
    }

    // Route to appropriate handler based on current step
    switch (currentStep) {
      // /start registration flow steps
      case 'share_contact':
        // User sent text instead of sharing contact - remind them
        await this.sendMessageToUser(
          bot,
          telegramUser.chatId || '',
          'Iltimos, telefon raqamingizni ulashish uchun quyidagi tugmani bosing. 👇',
        );
        break;
      case 'input_first_name':
        await this.handleStartRegistrationFirstName(bot, telegramUser, text);
        break;
      case 'input_last_name':
        await this.handleStartRegistrationLastName(bot, telegramUser, text);
        break;
      // Existing enrollment flow steps
      case 'enter_name':
        await this.handleNameEntry(bot, telegramUser, text);
        break;
      case 'select_group':
        await this.handleGroupSelection(bot, telegramUser, text);
        break;
      case 'select_payment':
        await this.handlePaymentSelection(bot, telegramUser, text);
        break;
      default:
        this.logger.warn(
          `Unknown user step: ${currentStep} for user ${telegramUser.telegramId}`,
        );
        break;
    }
  }

  /**
   * Handle name entry step
   */
  private async handleNameEntry(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    text: string,
  ) {
    const name = text.trim();

    if (name.length < 2) {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        "❌ Iltimos, to'liq ismingizni kiriting (kamida 2 harf).",
      );
      return;
    }

    // Save name to StudentBotState
    await this.prisma.studentBotState.upsert({
      where: {
        telegramUserId_centerId: {
          telegramUserId: telegramUser.id,
          centerId: bot.centerId,
        },
      },
      update: {
        studentName: name,
        currentStep: 'select_group',
      },
      create: {
        telegramUserId: telegramUser.id,
        centerId: bot.centerId,
        studentName: name,
        currentStep: 'select_group',
        contactShared: true,
      },
    });

    // Update user step
    await this.prisma.telegramUser.update({
      where: { id: telegramUser.id },
      data: { userStep: 'select_group' },
    });

    // Show available groups
    const groups = await this.prisma.group.findMany({
      where: {
        centerId: bot.centerId,
        status: 'ACTIVE',
        isDeleted: false,
      },
      orderBy: { name: 'asc' },
    });

    if (groups.length === 0) {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        "❌ Hozirda mavjud guruhlar yo'q. Iltimos, keyinroq qayta urinib ko'ring.",
      );
      return;
    }

    let groupList = `✅ Rahmat, ${name}!\n\n📚 Mavjud guruhlar:\n\n`;
    groups.forEach((group, index) => {
      groupList += `${index + 1}. ${group.name}\n`;
      groupList += `   💰 Narx: ${group.monthlyPrice} so'm/oy\n`;
      if (group.description) {
        groupList += `   📝 ${group.description}\n`;
      }
      groupList += `\n`;
    });

    groupList += `\nGuruh raqamini kiriting (1-${groups.length}):`;

    await this.sendMessageToUser(bot, telegramUser.chatId || '', groupList);
  }

  /**
   * Handle group selection step
   */
  private async handleGroupSelection(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    text: string,
  ) {
    const groupNumber = parseInt(text.trim(), 10);

    // Get available groups
    const groups = await this.prisma.group.findMany({
      where: {
        centerId: bot.centerId,
        status: 'ACTIVE',
        isDeleted: false,
      },
      include: {
        groupDiscounts: {
          where: { isDeleted: false },
          orderBy: { months: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (isNaN(groupNumber) || groupNumber < 1 || groupNumber > groups.length) {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        `❌ Noto'g'ri raqam. Iltimos, 1 dan ${groups.length} gacha raqam kiriting.`,
      );
      return;
    }

    const selectedGroup = groups[groupNumber - 1];

    // Update state with selected group
    await this.prisma.studentBotState.update({
      where: {
        telegramUserId_centerId: {
          telegramUserId: telegramUser.id,
          centerId: bot.centerId,
        },
      },
      data: {
        groupId: selectedGroup.id,
        currentStep: 'select_payment',
      },
    });

    // Update user step
    await this.prisma.telegramUser.update({
      where: { id: telegramUser.id },
      data: { userStep: 'select_payment' },
    });

    // Show payment options
    let paymentOptions = `✅ Siz tanladingiz: ${selectedGroup.name}\n\n`;
    paymentOptions += `💰 To'lov variantlari:\n\n`;
    paymentOptions += `1. 1 oy - ${selectedGroup.monthlyPrice} so'm\n`;

    // Add multi-month options with discounts
    selectedGroup.groupDiscounts.forEach((discount, index) => {
      const totalPrice =
        Number(selectedGroup.monthlyPrice) * discount.months -
        Number(discount.discountAmount);
      paymentOptions += `${index + 2}. ${discount.months} oy - ${totalPrice} so'm `;
      paymentOptions += `(${discount.discountAmount} so'm chegirma!)\n`;
    });

    paymentOptions += `\nTo'lov turini tanlang (1-${1 + selectedGroup.groupDiscounts.length}):`;

    await this.sendMessageToUser(
      bot,
      telegramUser.chatId || '',
      paymentOptions,
    );
  }

  /**
   * Handle payment selection step
   */
  private async handlePaymentSelection(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    text: string,
  ) {
    const paymentOption = parseInt(text.trim(), 10);

    // Get bot state
    const botState = await this.prisma.studentBotState.findUnique({
      where: {
        telegramUserId_centerId: {
          telegramUserId: telegramUser.id,
          centerId: bot.centerId,
        },
      },
    });

    if (!botState || !botState.groupId) {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        '❌ Xatolik yuz berdi. Iltimos, qaytadan boshlang.',
      );
      return;
    }

    // Get group with discounts
    const group = await this.prisma.group.findUnique({
      where: { id: botState.groupId },
      include: {
        groupDiscounts: {
          where: { isDeleted: false },
          orderBy: { months: 'asc' },
        },
      },
    });

    if (!group) {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        '❌ Guruh topilmadi.',
      );
      return;
    }

    const maxOptions = 1 + group.groupDiscounts.length;
    if (
      isNaN(paymentOption) ||
      paymentOption < 1 ||
      paymentOption > maxOptions
    ) {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        `❌ Noto'g'ri tanlov. Iltimos, 1 dan ${maxOptions} gacha raqam kiriting.`,
      );
      return;
    }

    // Calculate months and amount
    let months = 1;
    let amount = Number(group.monthlyPrice);

    if (paymentOption > 1) {
      const discount = group.groupDiscounts[paymentOption - 2];
      months = discount.months;
      amount =
        Number(group.monthlyPrice) * months - Number(discount.discountAmount);
    }

    // Check for existing pending payment (one-payment-at-a-time enforcement)
    if (telegramUser.user) {
      const student = await this.prisma.student.findFirst({
        where: {
          userId: telegramUser.user.id,
          centerId: bot.centerId,
          isDeleted: false,
        },
      });

      if (student) {
        const existingPendingPayment = await this.prisma.payment.findFirst({
          where: {
            studentId: student.id,
            groupId: group.id,
            status: 'PENDING',
            isDeleted: false,
          },
        });

        if (existingPendingPayment) {
          await this.sendMessageToUser(
            bot,
            telegramUser.chatId || '',
            "❌ Sizda bu guruh uchun kutilayotgan to'lov mavjud. Avval uni yakunlang.",
          );
          return;
        }
      }
    }

    // Save selected payment info to state
    await this.prisma.studentBotState.update({
      where: {
        telegramUserId_centerId: {
          telegramUserId: telegramUser.id,
          centerId: bot.centerId,
        },
      },
      data: {
        selectedMonths: months,
        currentStep: 'waiting_receipt',
        metadata: {
          amount,
          months,
        },
      },
    });

    // Update user step
    await this.prisma.telegramUser.update({
      where: { id: telegramUser.id },
      data: { userStep: 'waiting_receipt' },
    });

    // Show payment cards
    const paymentCards = await this.prisma.centerPaymentCard.findMany({
      where: {
        centerId: bot.centerId,
        isVisible: true,
        isActive: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
    });

    let paymentInfo = `✅ To'lov: ${months} oy - ${amount} so'm\n\n`;

    if (paymentCards && paymentCards.length > 0) {
      paymentInfo += `💳 To'lov uchun kartalar:\n\n`;

      for (const card of paymentCards) {
        paymentInfo += `${card.isPrimary ? '⭐ ' : ''}${card.cardNumber}\n`;
        paymentInfo += `${card.cardHolder}\n`;
        if (card.bankName) {
          paymentInfo += `Bank: ${card.bankName}\n`;
        }
        paymentInfo += `\n`;
      }

      paymentInfo += `\nTo'lov chekini rasmda yuboring 📸`;
    } else {
      paymentInfo += `\nIltimos, admin bilan bog'laning.`;
    }

    await this.sendMessageToUser(bot, telegramUser.chatId || '', paymentInfo);
  }

  /**
   * Handle photo messages (payment receipt)
   */
  private async handlePhotoMessage(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    message: TelegramMessage,
  ) {
    this.logger.log(
      `Received photo from ${telegramUser.telegramId} for center ${bot.center.name}`,
    );

    // Check if user is in waiting_receipt state
    if (telegramUser.userStep !== 'waiting_receipt') {
      this.logger.debug(
        `User ${telegramUser.telegramId} sent photo but not in waiting_receipt state`,
      );
      return;
    }

    if (!message.photo || message.photo.length === 0) {
      return;
    }

    const photo = message.photo[message.photo.length - 1]; // Get largest photo
    const fileId = photo.file_id;

    // Get file info
    const fileInfo = await this.telegramApi.getFile(bot.botToken, fileId);

    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        '❌ Rasmni yuklab olishda xatolik. Iltimos, qayta yuboring.',
      );
      return;
    }

    const fileUrl = this.telegramApi.getFileUrl(
      bot.botToken,
      fileInfo.result.file_path,
    );

    this.logger.log(`Payment receipt file URL: ${fileUrl}`);

    // Get bot state
    const botState = await this.prisma.studentBotState.findUnique({
      where: {
        telegramUserId_centerId: {
          telegramUserId: telegramUser.id,
          centerId: bot.centerId,
        },
      },
    });

    if (!botState || !botState.groupId || !botState.metadata) {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        '❌ Xatolik yuz berdi. Iltimos, qaytadan boshlang.',
      );
      return;
    }

    const metadata = botState.metadata as any;
    const amount = metadata.amount;
    const months = metadata.months;

    if (!amount || !months) {
      this.logger.error(
        `Missing amount or months in metadata for user ${telegramUser.id}`,
      );
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        '❌ Xatolik yuz berdi. Iltimos, qaytadan boshlang.',
      );
      return;
    }

    // Ensure user has a linked User record
    let linkedUser = telegramUser.user;
    if (!linkedUser) {
      // Create User record
      const defaultPhoneNumber = `998${telegramUser.telegramId.slice(-9).padStart(9, '0')}`;

      const userData = buildUserData({
        firstName: telegramUser.firstName || botState.studentName,
        lastName: telegramUser.lastName,
        phoneNumber: telegramUser.phoneNumber || defaultPhoneNumber,
        centerId: bot.centerId,
        userType: UserType.STUDENT,
        authProvider: 'telegram',
        telegramUserId: telegramUser.id,
        username: telegramUser.username,
      });

      this.logger.log(
        `Creating user for payment with username: ${userData.username || 'NOT SET'}`,
      );

      linkedUser = await this.prisma.user.create({
        data: userData,
      });

      this.logger.log(
        `Created linked User ${linkedUser.id} for payment processing`,
      );
    }

    // Find or create Student record
    let student = await this.prisma.student.findFirst({
      where: {
        userId: linkedUser.id,
        centerId: bot.centerId,
        isDeleted: false,
      },
    });

    if (!student) {
      student = await this.prisma.student.create({
        data: {
          userId: linkedUser.id,
          centerId: bot.centerId,
          firstName: linkedUser.firstName,
          lastName: linkedUser.lastName,
        },
      });

      this.logger.log(`Created Student record ${student.id}`);
    }

    // Download receipt image and save to server
    let receiptFilePath = fileUrl; // Fallback to URL
    try {
      receiptFilePath = await this.downloadAndSaveReceipt(
        bot.botToken,
        fileUrl,
        bot.centerId,
        student.id,
      );
      this.logger.log(`Receipt saved to: ${receiptFilePath}`);
    } catch (error) {
      this.logger.error(
        `Failed to download receipt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Continue with URL fallback
    }

    // Create Payment record
    const payment = await this.prisma.payment.create({
      data: {
        centerId: bot.centerId,
        groupId: botState.groupId,
        studentId: student.id,
        amount,
        currency: 'UZS',
        status: 'PENDING',
        paymentMethod: 'BANK_TRANSFER',
        notes: `Receipt: ${receiptFilePath}\nMonths: ${months}\nCaption: ${message.caption || 'N/A'}`,
        periodStart: new Date(),
      },
    });

    this.logger.log(`Created Payment record ${payment.id} for ${amount} UZS`);

    // Update bot state with payment ID
    await this.prisma.studentBotState.update({
      where: {
        telegramUserId_centerId: {
          telegramUserId: telegramUser.id,
          centerId: bot.centerId,
        },
      },
      data: {
        paymentId: payment.id,
        currentStep: 'completed',
      },
    });

    // Clear user step (enrollment complete)
    await this.prisma.telegramUser.update({
      where: { id: telegramUser.id },
      data: { userStep: null },
    });

    await this.sendMessageToUser(
      bot,
      telegramUser.chatId || '',
      '✅ Chek qabul qilindi!\n\n' +
        `To'lovingiz tekshirilmoqda (${amount} so'm, ${months} oy).\n` +
        'Tasdiqlangandan keyin sizga xabar beramiz.\n\n' +
        "Yangi guruhga yozilish uchun /start buyrug'ini yuboring.",
    );

    this.logger.log(
      `Payment receipt processed for user ${telegramUser.telegramId}, payment ID: ${payment.id}`,
    );

    // Notify admins about new payment receipt
    try {
      await this.notifyAdminsAboutNewReceipt(
        bot,
        payment,
        student,
        linkedUser,
        botState.groupId,
        months,
        fileId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify admins: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Handle "Send Receipt" button
   */
  private async handleSendReceiptButton(
    bot: TelegramBotWithCenter,
    chatId: number,
    _params: string[],
  ) {
    // const courseToken = params[0]; // TODO: Will be used later

    await this.sendMessageToUser(
      bot,
      chatId,
      "📸 Iltimos, to'lov chekining rasmini yuboring.\n\n" +
        "Rasmda summа va sana aniq ko'rinishi kerak.",
    );

    // TODO: Set user state to "WAITING_FOR_RECEIPT"
  }

  /**
   * Handle "Cancel Enrollment" button
   */
  private async handleCancelEnrollment(
    bot: TelegramBotWithCenter,
    chatId: number,
    _params: string[],
  ) {
    // const courseToken = params[0]; // TODO: Will be used later

    await this.sendMessageToUser(
      bot,
      chatId,
      '❌ Kursga yozilish bekor qilindi.\n\n' +
        "Yana ro'yxatdan o'tish uchun havolani bosing.",
    );

    // TODO: Delete enrollment record if exists
  }

  /**
   * Send message to user through bot
   */
  private async sendMessageToUser(
    bot: TelegramBotWithCenter,
    chatId: string | number,
    text: string,
    options?: {
      parse_mode?: 'HTML' | 'Markdown';
      reply_markup?: unknown;
    },
  ) {
    return this.telegramApi.sendMessage(bot.botToken, chatId, text, options);
  }

  /**
   * Notify student about custom discount assignment
   * Public method to be called from EnrollmentsController
   */
  async notifyStudentAboutDiscount(enrollment: any, isFreeEnrollment: boolean) {
    // Check if student has telegram user linked
    if (!enrollment.student?.user?.telegramUserId) {
      this.logger.warn(
        `Student ${enrollment.studentId} has no Telegram account linked`,
      );
      return;
    }

    // Get telegram user
    const telegramUser = await this.prisma.telegramUser.findUnique({
      where: { id: enrollment.student.user.telegramUserId },
    });

    if (!telegramUser || !telegramUser.chatId) {
      this.logger.warn(
        `TelegramUser not found or no chatId for student ${enrollment.studentId}`,
      );
      return;
    }

    // Get bot for this center
    const bot = await this.prisma.centerTelegramBot.findFirst({
      where: {
        centerId: enrollment.group.centerId,
        isActive: true,
        isDeleted: false,
      },
      include: {
        center: true,
      },
    });

    if (!bot) {
      this.logger.warn(
        `No active bot found for center ${enrollment.group.centerId}`,
      );
      return;
    }

    // Format price
    const formatPrice = (price: number) => {
      return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    try {
      if (isFreeEnrollment) {
        // Free enrollment - just notify about group access
        const message =
          `🎉 <b>Tabriklaymiz!</b>\n\n` +
          `Siz "<b>${enrollment.group.name}</b>" guruhiga qo'shildingiz!\n\n` +
          `Darslar bepul taqdim etiladi. Omad tilaymiz! 🎓`;

        await this.sendMessageToUser(bot, telegramUser.chatId, message, {
          parse_mode: 'HTML',
        });
      } else {
        // Paid enrollment with discount
        const customPrice = Number(enrollment.customMonthlyPrice);
        const currentBalance = Number(enrollment.balance);

        let message = `💰 <b>Maxsus narx belgilandi</b>\n\n`;
        message += `📚 Guruh: <b>${enrollment.group.name}</b>\n`;
        message += `💵 Siz uchun kurs to'lovi <b>${formatPrice(customPrice)} so'm</b> etib belgilandi.\n\n`;

        // Check if student is ACTIVE with existing balance
        if (enrollment.status === 'ACTIVE' && currentBalance > 0) {
          // Student has positive balance - no immediate payment needed
          message += `✅ Sizning hisobingizda <b>${formatPrice(currentBalance)} so'm</b> mavjud.\n`;
          message += `Bu mablag' yangi narx bo'yicha darslaringizni qoplash uchun ishlatiladi.\n\n`;
          message += `🎓 Darslaringiz davom etaveradi!`;

          // No payment button needed
          await this.sendMessageToUser(bot, telegramUser.chatId, message, {
            parse_mode: 'HTML',
          });
        } else if (enrollment.status === 'ACTIVE' && currentBalance < 0) {
          // Student has debt - show current debt
          message += `⚠️ Hozirgi qarzingiz: <b>${formatPrice(Math.abs(currentBalance))} so'm</b>\n`;
          message += `Yangi narx: <b>${formatPrice(customPrice)} so'm/oy</b>\n\n`;
          message += `To'lash uchun pastdagi tugmani bosing 👇`;

          const buttons = [
            [
              {
                text: `💳 ${formatPrice(customPrice)} so'm to'lash`,
                callback_data: `pay:${enrollment.groupId}:1`,
              },
            ],
          ];

          await this.sendMessageToUser(bot, telegramUser.chatId, message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: buttons,
            },
          });
        } else {
          // LEAD or TRIAL status - show payment button
          message += `To'lash uchun pastdagi tugmani bosing 👇`;

          const buttons = [
            [
              {
                text: `💳 ${formatPrice(customPrice)} so'm to'lash`,
                callback_data: `pay:${enrollment.groupId}:1`,
              },
            ],
          ];

          await this.sendMessageToUser(bot, telegramUser.chatId, message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: buttons,
            },
          });
        }
      }

      this.logger.log(
        `Sent discount notification to student ${enrollment.studentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send discount notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Notify student about freeze approval
   */
  async notifyStudentAboutFreeze(
    freeze: any,
    type: 'CREATED' | 'ENDED' | 'CANCELLED',
  ) {
    // Check if student has telegram user linked
    if (!freeze.enrollment?.student?.user?.telegramUserId) {
      this.logger.warn(
        `Student ${freeze.studentId} has no linked Telegram user. Cannot send freeze notification.`,
      );
      return;
    }

    const telegramUser = await this.prisma.telegramUser.findUnique({
      where: { id: freeze.enrollment.student.user.telegramUserId },
      include: { user: true },
    });

    if (!telegramUser || !telegramUser.chatId) {
      this.logger.warn(
        `TelegramUser ${freeze.enrollment.student.user.telegramUserId} not found or has no chatId.`,
      );
      return;
    }

    const bot = await this.prisma.centerTelegramBot.findFirst({
      where: { centerId: freeze.enrollment.group.centerId, isActive: true },
      include: { center: true },
    });

    if (!bot) {
      this.logger.error(
        `No active bot found for center ${freeze.enrollment.group.centerId}`,
      );
      return;
    }

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    let message = '';

    if (type === 'CREATED') {
      message =
        `❄️ <b>Darslar muzlatildi</b>\n\n` +
        `📚 Guruh: <b>${freeze.enrollment.group.name}</b>\n` +
        `📅 Boshlanish: ${formatDate(freeze.freezeStartDate)}\n`;

      if (freeze.freezeEndDate) {
        message += `📅 Tugash: ${formatDate(freeze.freezeEndDate)}\n`;
      } else {
        message += `📅 Tugash: Noma'lum (admin tomonidan belgilanadi)\n`;
      }

      message += `\n💡 Muzlatish davomida to'lov talab qilinmaydi.`;
    } else if (type === 'ENDED') {
      message =
        `✅ <b>Muzlatish tugadi</b>\n\n` +
        `📚 Guruh: <b>${freeze.enrollment.group.name}</b>\n` +
        `🎓 Darslaringiz davom etadi!\n\n` +
        `Omad tilaymiz!`;
    } else if (type === 'CANCELLED') {
      message =
        `🚫 <b>Muzlatish bekor qilindi</b>\n\n` +
        `📚 Guruh: <b>${freeze.enrollment.group.name}</b>\n` +
        `🎓 Darslaringiz davom etadi!`;
    }

    try {
      await this.sendMessageToUser(bot, telegramUser.chatId, message, {
        parse_mode: 'HTML',
      });

      this.logger.log(
        `Sent freeze ${type} notification to student ${freeze.studentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send freeze notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Notify student about refund request status
   */
  async notifyStudentAboutRefund(
    refund: any,
    type: 'CREATED' | 'APPROVED' | 'REJECTED',
  ) {
    // Check if student has telegram user linked
    if (!refund.student?.user?.telegramUserId) {
      this.logger.warn(
        `Student ${refund.studentId} has no linked Telegram user. Cannot send refund notification.`,
      );
      return;
    }

    const telegramUser = await this.prisma.telegramUser.findUnique({
      where: { id: refund.student.user.telegramUserId },
      include: { user: true },
    });

    if (!telegramUser || !telegramUser.chatId) {
      this.logger.warn(
        `TelegramUser ${refund.student.user.telegramUserId} not found or has no chatId.`,
      );
      return;
    }

    const bot = await this.prisma.centerTelegramBot.findFirst({
      where: { centerId: refund.centerId, isActive: true },
      include: { center: true },
    });

    if (!bot) {
      this.logger.error(`No active bot found for center ${refund.centerId}`);
      return;
    }

    const formatPrice = (price: number) =>
      price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    let message = '';

    if (type === 'CREATED') {
      message =
        `📝 <b>Qaytarish so'rovi qabul qilindi</b>\n\n` +
        `💰 Qaytariladigan summa: <b>${formatPrice(Number(refund.refundAmount))} so'm</b>\n` +
        `📊 Jami to'langan: ${formatPrice(Number(refund.totalPaid))} so'm\n` +
        `📚 Qatnashgan darslar: ${refund.lessonsAttended} / ${refund.totalLessons}\n\n` +
        `⏳ So'rovingiz ko'rib chiqilmoqda...`;
    } else if (type === 'APPROVED') {
      message =
        `✅ <b>Qaytarish so'rovi tasdiqlandi</b>\n\n` +
        `💰 Qaytariladigan summa: <b>${formatPrice(Number(refund.refundAmount))} so'm</b>\n\n` +
        `Pul yaqin kunlarda hisobingizga qaytariladi.\n` +
        `Bizning xizmatlarimizdan foydalanganingiz uchun rahmat! 🙏`;
    } else if (type === 'REJECTED') {
      message = `❌ <b>Qaytarish so'rovi rad etildi</b>\n\n`;

      if (refund.processingNotes) {
        message += `📝 Sabab: ${refund.processingNotes}\n\n`;
      }

      message += `Agar savollaringiz bo'lsa, administrator bilan bog'laning.`;
    }

    try {
      await this.sendMessageToUser(bot, telegramUser.chatId, message, {
        parse_mode: 'HTML',
      });

      this.logger.log(
        `Sent refund ${type} notification to student ${refund.studentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send refund notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Download and save receipt image to server
   */
  private async downloadAndSaveReceipt(
    botToken: string,
    fileUrl: string,
    centerId: number,
    studentId: number,
  ): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Download file
    const fileBuffer = await this.telegramApi.downloadFile(fileUrl);

    // Create directory structure: uploads/receipts/{centerId}/
    const uploadsDir = path.join(
      process.cwd(),
      'uploads',
      'receipts',
      centerId.toString(),
    );
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate filename: receipt_{studentId}_{timestamp}.jpg
    const timestamp = Date.now();
    const filename = `receipt_${studentId}_${timestamp}.jpg`;
    const filePath = path.join(uploadsDir, filename);

    // Save file
    await fs.writeFile(filePath, fileBuffer);

    // Return relative path
    return `uploads/receipts/${centerId}/${filename}`;
  }

  /**
   * Handle payment rejection by admin
   */
  private async handleRejectPayment(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    paymentId: string,
    callbackQuery: TelegramCallbackQuery,
  ) {
    this.logger.log(`Admin ${telegramUser.id} rejecting payment ${paymentId}`);

    const paymentIdNum = parseInt(paymentId, 10);
    if (isNaN(paymentIdNum)) {
      await this.telegramApi.answerCallbackQuery(
        bot.botToken,
        callbackQuery.id,
        "❌ Xatolik: Noto'g'ri payment ID",
        true,
      );
      return;
    }

    // Get payment
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentIdNum },
    });

    if (!payment) {
      await this.telegramApi.answerCallbackQuery(
        bot.botToken,
        callbackQuery.id,
        "❌ To'lov topilmadi",
        true,
      );
      return;
    }

    // Security check
    if (payment.centerId !== bot.centerId) {
      await this.telegramApi.answerCallbackQuery(
        bot.botToken,
        callbackQuery.id,
        "❌ Ruxsat yo'q",
        true,
      );
      return;
    }

    // Check if already cancelled
    if (payment.status === 'CANCELLED') {
      await this.telegramApi.answerCallbackQuery(
        bot.botToken,
        callbackQuery.id,
        "ℹ️ Bu to'lov allaqachon bekor qilingan",
        true,
      );
      return;
    }

    // Set admin state to wait for rejection reason
    // Store message info in metadata for later update
    await this.prisma.telegramUser.update({
      where: { id: telegramUser.id },
      data: {
        userStep: `waiting_rejection_reason:${paymentId}:${callbackQuery.message.message_id}:${callbackQuery.message.chat.id}`,
      },
    });

    await this.telegramApi.answerCallbackQuery(
      bot.botToken,
      callbackQuery.id,
      'Bekor qilish sababini yozing',
    );

    await this.sendMessageToUser(
      bot,
      callbackQuery.message.chat.id,
      "📝 Iltimos, to'lovni bekor qilish sababini yozing:",
    );
  }

  /**
   * Handle rejection reason input from admin
   */
  private async handleRejectionReasonInput(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    reason: string,
    paymentId: string,
    _originalMessageId?: number,
    _originalChatId?: number,
  ) {
    this.logger.log(
      `Processing rejection reason for payment ${paymentId} from admin ${telegramUser.id}, reason: "${reason}"`,
    );
    this.logger.log(
      `Original message params - messageId: ${_originalMessageId}, chatId: ${_originalChatId}`,
    );

    const paymentIdNum = parseInt(paymentId, 10);
    if (isNaN(paymentIdNum)) {
      this.logger.error(`Invalid payment ID: ${paymentId}`);
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        '❌ Xatolik yuz berdi.',
      );
      return;
    }

    // Get payment with student info
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentIdNum },
      include: {
        student: {
          include: {
            user: {
              include: {
                telegramUser: true,
              },
            },
          },
        },
        group: true,
      },
    });

    if (!payment) {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        "❌ To'lov topilmadi.",
      );
      return;
    }

    // Security check
    if (payment.centerId !== bot.centerId) {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        "❌ Ruxsat yo'q.",
      );
      return;
    }

    try {
      // Update payment status
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CANCELLED',
          notes: `${payment.notes}\n\nBekor qilish sababi: ${reason}`,
        },
      });

      // Clear admin state
      await this.prisma.telegramUser.update({
        where: { id: telegramUser.id },
        data: { userStep: null },
      });
      const formatPrice = (price: number) =>
        price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      // Send rejection message to student
      const studentTelegramUser = payment.student.user?.telegramUser;
      if (studentTelegramUser?.chatId) {
        this.logger.log(
          `Sending rejection message to student ${payment.student.id} at chatId ${studentTelegramUser.chatId}`,
        );

        let studentMessage = `❌ <b>To'lovingiz bekor qilindi</b>\n\n`;
        studentMessage += `💰 Summa: ${formatPrice(Number(payment.amount))} so'm\n`;
        studentMessage += `📚 Guruh: ${payment.group.name}\n\n`;
        studentMessage += `📝 <b>Sabab:</b> ${reason}\n\n`;
        studentMessage += `Iltimos, to'lovni qaytadan amalga oshiring yoki admin bilan bog'laning.`;

        await this.sendMessageToUser(
          bot,
          studentTelegramUser.chatId,
          studentMessage,
          {
            parse_mode: 'HTML',
          },
        );

        this.logger.log(`Rejection message sent to student successfully`);
      } else {
        this.logger.warn(
          `Student ${payment.student.id} has no telegram chatId, cannot send rejection message`,
        );
      }

      // Update the original payment message to show rejection status
      if (_originalMessageId && _originalChatId) {
        try {
          // Build updated message with rejection status
          let updatedMessage = `❌ <b>To'lov bekor qilindi</b>\n\n`;
          updatedMessage += `👤 <b>Talaba:</b> ${payment.student.user?.firstName || ''} ${payment.student.user?.lastName || ''}\n`;
          updatedMessage += `📱 <b>Telefon:</b> ${payment.student.user?.phoneNumber}\n`;
          updatedMessage += `📚 <b>Guruh:</b> ${payment.group.name}\n`;
          updatedMessage += `💰 <b>To'lov summasi:</b> ${formatPrice(Number(payment.amount))} so'm\n\n`;
          updatedMessage += `📝 <b>Bekor qilish sababi:</b> ${reason}\n`;
          updatedMessage += `👤 <b>Bekor qilgan:</b> ${telegramUser.user?.firstName || 'Admin'}`;

          // Use direct HTTP request to edit message caption (payment messages are photos)
          const url = `https://api.telegram.org/bot${bot.botToken}/editMessageCaption`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: _originalChatId,
              message_id: _originalMessageId,
              caption: updatedMessage,
              parse_mode: 'HTML',
              // Remove buttons by not including reply_markup
            }),
          });

          const result = await response.json();

          if (!result.ok) {
            this.logger.error(
              `Failed to update message: ${result.description || 'Unknown error'}`,
            );
            this.logger.error(`Full response: ${JSON.stringify(result)}`);
          } else {
            this.logger.log(
              `Updated original message ${_originalMessageId} with rejection status`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to update original message: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Confirm to admin and send detailed message
      let confirmMessage = "✅ <b>To'lov bekor qilindi</b>\n\n";
      confirmMessage += `💰 Summa: ${formatPrice(Number(payment.amount))} so'm\n`;
      confirmMessage += `📚 Guruh: ${payment.group.name}\n`;
      confirmMessage += `📝 Sabab: ${reason}\n\n`;
      confirmMessage += `Talabaga xabar yuborildi.`;

      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        confirmMessage,
        {
          parse_mode: 'HTML',
        },
      );

      this.logger.log(
        `Payment ${payment.id} rejected by admin ${telegramUser.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error rejecting payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        '❌ Xatolik yuz berdi.',
      );
    }
  }

  /**
   * Handle payment decision change (from approved to cancelled or vice versa)
   */
  private async handleChangePaymentDecision(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    paymentId: string,
    callbackQuery: TelegramCallbackQuery,
  ) {
    this.logger.log(
      `Admin ${telegramUser.id} changing decision for payment ${paymentId}`,
    );

    const paymentIdNum = parseInt(paymentId, 10);
    if (isNaN(paymentIdNum)) {
      await this.telegramApi.answerCallbackQuery(
        bot.botToken,
        callbackQuery.id,
        "❌ Xatolik: Noto'g'ri payment ID",
        true,
      );
      return;
    }

    // Get payment
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentIdNum },
    });

    if (!payment) {
      await this.telegramApi.answerCallbackQuery(
        bot.botToken,
        callbackQuery.id,
        "❌ To'lov topilmadi",
        true,
      );
      return;
    }

    // Security check
    if (payment.centerId !== bot.centerId) {
      await this.telegramApi.answerCallbackQuery(
        bot.botToken,
        callbackQuery.id,
        "❌ Ruxsat yo'q",
        true,
      );
      return;
    }

    // Remove the status line from original message
    let originalMessage =
      callbackQuery.message.caption || callbackQuery.message.text || '';

    // Remove previous status (✅ Tasdiqlandi or ❌ Bekor qilindi)
    originalMessage = originalMessage.replace(/\n\n[✅❌].*$/s, '');

    // Show options to change decision
    const buttons = [
      [
        {
          text: '✅ Tasdiqlash',
          callback_data: `approve_payment:${payment.id}`,
        },
        {
          text: '❌ Bekor qilish',
          callback_data: `reject_payment:${payment.id}`,
        },
      ],
    ];

    await this.telegramApi.editMessageCaption(
      bot.botToken,
      callbackQuery.message.chat.id,
      callbackQuery.message.message_id,
      originalMessage,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: buttons,
        },
      },
    );

    await this.telegramApi.answerCallbackQuery(
      bot.botToken,
      callbackQuery.id,
      'Yangi qaror qabul qiling',
    );
  }

  /**
   * Handle payment approval by admin
   */
  private async handleApprovePayment(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    paymentId: string,
    callbackQuery: TelegramCallbackQuery,
  ) {
    this.logger.log(`Admin ${telegramUser.id} approving payment ${paymentId}`);

    const paymentIdNum = parseInt(paymentId, 10);
    if (isNaN(paymentIdNum)) {
      await this.telegramApi.answerCallbackQuery(
        bot.botToken,
        callbackQuery.id,
        "❌ Xatolik: Noto'g'ri payment ID",
        true,
      );
      return;
    }

    // Get payment with related data
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentIdNum },
      include: {
        student: {
          include: {
            user: {
              include: {
                telegramUser: true,
              },
            },
          },
        },
        group: true,
      },
    });

    if (!payment) {
      await this.telegramApi.answerCallbackQuery(
        bot.botToken,
        callbackQuery.id,
        "❌ To'lov topilmadi",
        true,
      );
      return;
    }

    // Security check: admin can only approve payments from their center
    if (payment.centerId !== bot.centerId) {
      await this.telegramApi.answerCallbackQuery(
        bot.botToken,
        callbackQuery.id,
        "❌ Ruxsat yo'q",
        true,
      );
      return;
    }

    // Check if already processed
    if (payment.status === 'PAID') {
      await this.telegramApi.answerCallbackQuery(
        bot.botToken,
        callbackQuery.id,
        "ℹ️ Bu to'lov allaqachon tasdiqlangan",
        true,
      );
      return;
    }

    try {
      // Extract months from notes
      const notesMatch = payment.notes?.match(/Months: (\d+)/);
      const months = notesMatch ? parseInt(notesMatch[1], 10) : 1;

      // Update payment status
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      // Find or create enrollment
      let enrollment = await this.prisma.enrollment.findUnique({
        where: {
          groupId_studentId: {
            groupId: payment.groupId,
            studentId: payment.studentId,
          },
        },
      });

      if (!enrollment) {
        // Create new enrollment
        enrollment = await this.prisma.enrollment.create({
          data: {
            groupId: payment.groupId,
            studentId: payment.studentId,
            status: 'ACTIVE',
            joinedAt: new Date(),
            baseLessonPrice: payment.group.monthlyPrice,
            perLessonPrice: payment.group.monthlyPrice,
            balance: Number(payment.amount),
            lastPaymentDate: new Date(),
          },
        });
      } else {
        // Update existing enrollment
        const newBalance = Number(enrollment.balance) + Number(payment.amount);
        await this.prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: 'ACTIVE',
            balance: newBalance,
            lastPaymentDate: new Date(),
          },
        });
      }

      this.logger.log(
        `Payment ${payment.id} approved, enrollment ${enrollment.id} updated`,
      );

      // Send success message to student
      const studentTelegramUser = payment.student.user?.telegramUser;
      if (studentTelegramUser?.chatId) {
        const formatPrice = (price: number) =>
          price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

        // Check if student is already in the group
        const isMember = await this.checkStudentMembership(
          bot.botToken,
          payment.groupId,
          studentTelegramUser.telegramId,
        );

        let studentMessage = `✅ <b>To'lovingiz tasdiqlandi!</b>\n\n`;
        studentMessage += `💰 Summa: ${formatPrice(Number(payment.amount))} so'm\n`;
        studentMessage += `📚 Guruh: ${payment.group.name}\n`;
        studentMessage += `📅 Davr: ${months} oy\n\n`;

        if (isMember) {
          studentMessage += `ℹ️ Siz allaqachon guruhda a'zosiz. Darslaringiz davom etaveradi!\n\n`;
          studentMessage += `Omad tilaymiz! 🎓`;
        } else {
          // Generate invite link
          if (payment.group.telegramGroupId) {
            try {
              const inviteLinkResponse =
                await this.telegramApi.createChatInviteLink(
                  bot.botToken,
                  payment.group.telegramGroupId,
                  {
                    member_limit: 1,
                    name: `${payment.student.user?.firstName || 'Student'} - Payment Approved`,
                  },
                );

              const result = inviteLinkResponse.result as
                | { invite_link?: string }
                | undefined;

              if (inviteLinkResponse.ok && result?.invite_link) {
                studentMessage += `Quyidagi havola orqali guruhga qo'shiling:\n`;
                studentMessage += `👉 ${result.invite_link}\n\n`;
                studentMessage += `<i>⚠️ Bu havola faqat 1 marta ishlaydi.</i>\n\n`;
                studentMessage += `Omad tilaymiz! 🎓`;
              } else {
                studentMessage += `Guruhga qo'shilish uchun admin bilan bog'laning.`;
              }
            } catch (error) {
              this.logger.error(
                `Failed to create invite link: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
              studentMessage += `Guruhga qo'shilish uchun admin bilan bog'laning.`;
            }
          } else {
            studentMessage += `Guruhga qo'shilish uchun admin bilan bog'laning.`;
          }
        }

        await this.sendMessageToUser(
          bot,
          studentTelegramUser.chatId,
          studentMessage,
          {
            parse_mode: 'HTML',
          },
        );
      }

      // Update admin message (photo message with caption)
      const updatedMessage =
        callbackQuery.message.caption || callbackQuery.message.text || '';
      const newMessage = `${updatedMessage}\n\n✅ <b>Tasdiqlandi</b> (${telegramUser.user?.firstName || 'Admin'})`;

      await this.telegramApi.editMessageCaption(
        bot.botToken,
        callbackQuery.message.chat.id,
        callbackQuery.message.message_id,
        newMessage,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🔄 O'zgartirish",
                  callback_data: `change_payment_decision:${payment.id}`,
                },
              ],
            ],
          },
        },
      );

      await this.telegramApi.answerCallbackQuery(
        bot.botToken,
        callbackQuery.id,
        "✅ To'lov muvaffaqiyatli tasdiqlandi!",
      );
    } catch (error) {
      this.logger.error(
        `Error approving payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      await this.telegramApi.answerCallbackQuery(
        bot.botToken,
        callbackQuery.id,
        '❌ Xatolik yuz berdi',
        true,
      );
    }
  }

  /**
   * Check if student is member of telegram group
   */
  private async checkStudentMembership(
    botToken: string,
    groupId: number,
    studentTelegramId: string,
  ): Promise<boolean> {
    try {
      // Get group's telegram group ID
      const group = await this.prisma.group.findUnique({
        where: { id: groupId, isDeleted: false },
      });

      if (!group || !group.telegramGroupId) {
        this.logger.warn(
          `Group ${groupId} not found or has no telegram group connected`,
        );
        return false;
      }

      // Check membership via Telegram API
      const chatMember = await this.telegramApi.getChatMember(
        botToken,
        group.telegramGroupId,
        parseInt(studentTelegramId, 10),
      );

      if (!chatMember.ok || !chatMember.result) {
        return false;
      }

      const status = chatMember.result.status;
      // Member statuses: creator, administrator, member, restricted, left, kicked
      return ['creator', 'administrator', 'member', 'restricted'].includes(
        status,
      );
    } catch (error) {
      this.logger.error(
        `Error checking membership: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  /**
   * Notify admins about new payment receipt
   */
  private async notifyAdminsAboutNewReceipt(
    bot: TelegramBotWithCenter,
    payment: any,
    student: any,
    user: any,
    groupId: number,
    months: number,
    photoFileId: string,
  ) {
    this.logger.log(
      `Notifying admins about new receipt for payment ${payment.id}`,
    );

    // Get group info with enrollment (to check custom price)
    const group = await this.prisma.group.findUnique({
      where: { id: groupId, isDeleted: false },
    });

    if (!group) {
      this.logger.error(`Group ${groupId} not found`);
      return;
    }

    // Check if student has custom price for this group
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        groupId_studentId: {
          groupId: group.id,
          studentId: student.id,
        },
      },
    });

    // Find all admins for this center with telegram accounts
    const admins = await this.prisma.user.findMany({
      where: {
        centerId: bot.centerId,
        userType: 'ADMIN',
        isDeleted: false,
        telegramUserId: { not: null },
      },
      include: {
        telegramUser: true,
      },
    });

    if (admins.length === 0) {
      this.logger.warn(
        `No admins with Telegram accounts found for center ${bot.centerId}`,
      );
      return;
    }

    // Format price helper
    const formatPrice = (price: number) => {
      return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    // Build message
    let message = `🆕 <b>Yangi to'lov cheki</b>\n\n`;
    message += `👤 <b>Talaba:</b> ${user.firstName || ''} ${user.lastName || ''}\n`;
    message += `📱 <b>Telefon:</b> ${user.phoneNumber}\n`;
    message += `📚 <b>Guruh:</b> ${group.name}\n`;
    message += `📅 <b>Davr:</b> ${months} oy\n`;
    message += `💰 <b>To'lov summasi:</b> ${formatPrice(Number(payment.amount))} so'm\n\n`;

    // Show group price and custom price if exists
    message += `💵 <b>Guruh narxi:</b> ${formatPrice(Number(group.monthlyPrice))} so'm/oy\n`;

    if (enrollment?.customMonthlyPrice) {
      const customPrice = Number(enrollment.customMonthlyPrice);
      const groupPrice = Number(group.monthlyPrice);
      const difference = groupPrice - customPrice;

      message += `💎 <b>Talaba uchun maxsus narx:</b> ${formatPrice(customPrice)} so'm/oy\n`;
      if (difference > 0) {
        message += `📉 <b>Chegirma:</b> ${formatPrice(difference)} so'm/oy\n`;
      } else if (difference < 0) {
        message += `📈 <b>Qo'shimcha:</b> ${formatPrice(Math.abs(difference))} so'm/oy\n`;
      }
    }

    // Build inline keyboard
    const buttons = [
      [
        {
          text: '✅ Tasdiqlash',
          callback_data: `approve_payment:${payment.id}`,
        },
        {
          text: '❌ Bekor qilish',
          callback_data: `reject_payment:${payment.id}`,
        },
      ],
    ];

    // Send message with photo to each admin
    for (const admin of admins) {
      if (!admin.telegramUser?.chatId) {
        this.logger.warn(
          `Admin ${admin.id} (${admin.firstName}) has no chatId. They need to start the bot first with /start command.`,
        );
        continue;
      }

      try {
        await this.telegramApi.sendPhoto(
          bot.botToken,
          admin.telegramUser.chatId,
          photoFileId,
          message,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: buttons,
            },
          },
        );

        this.logger.log(
          `Sent receipt notification to admin ${admin.id} (${admin.firstName}) at chatId ${admin.telegramUser.chatId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send notification to admin ${admin.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }
}
