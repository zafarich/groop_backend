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

        // Show share contact button immediately
        await this.promptShareContact(bot, telegramUser);
        return;
      } else {
        // For group chat: Do nothing - group messages don't trigger user creation
        this.logger.log(
          `Ignoring message from group chat for new user ${telegramId}`,
        );
        return;
      }
    } else {
      // CASE 2: Telegram user already exists

      // Update chatId if changed
      if (telegramUser.chatId !== chatId) {
        telegramUser = (await this.prisma.telegramUser.update({
          where: { id: telegramUser.id },
          data: { chatId },
          include: { user: true },
        })) as TelegramUserWithUser;
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
          if (message.text && !message.text.startsWith('/')) {
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

    // Answer callback query immediately
    await this.telegramApi.answerCallbackQuery(
      bot.botToken,
      callbackQuery.id,
      "Ma'lumot qabul qilindi",
    );

    // Parse callback data
    // Format: action:param1:param2
    const [action, ...params] = data.split(':');

    switch (action) {
      case 'send_receipt':
        await this.handleSendReceiptButton(bot, chatId, params);
        break;
      case 'cancel_enrollment':
        await this.handleCancelEnrollment(bot, chatId, params);
        break;
      default:
        this.logger.warn(`Unknown callback action: ${action}`);
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
   * Handle /start command
   */
  private async handleStartCommand(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    param?: string,
  ) {
    // Parse start parameter (e.g., /start course_ABC123 or /start UUID)
    if (param) {
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
  ) {
    this.logger.log(
      `/connect command from ${telegramUser.telegramId} with token: ${token}`,
    );

    // Get chat ID and type from telegramUser
    const chatId = Number(telegramUser.chatId);
    const chatType = telegramUser.chatId ? 'group' : 'private'; // This is approximate

    // 1. Validate this is a group chat (not private)
    // In real implementation, you'd get this from the message object, but we can check using chat ID
    // Telegram group IDs are negative numbers
    if (chatId >= 0) {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        "❌ Bu buyruq faqat guruh chatida ishlatiladi! Iltimos, botni guruhga qo'shing va u yerda /connect buyrug'ini ishga tushiring.",
      );
      return;
    }

    // 2. Validate token provided
    if (!token || token.trim() === '') {
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
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

      // 4. Send success message with join link
      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        `✅ Muvaffaqiyatli ulandi!\n\n` +
          `📚 Guruh: ${result.name}\n` +
          `🔗 Join link: ${result.joinLink}\n\n` +
          `Endi o'quvchilar ushbu link orqali guruhga qo'shilishlari mumkin!`,
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

      await this.sendMessageToUser(
        bot,
        telegramUser.chatId || '',
        `❌ Xatolik: ${errorMessage}`,
      );
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
          authProvider: 'telegram', // Switch to telegram auth
          isActive: true, // Ensure active
        },
      });

      // 3. Update TelegramUser profile with Teacher's name if needed
      await tx.telegramUser.update({
        where: { id: telegramUser.id },
        data: {
          firstName: targetUser.firstName || telegramUser.firstName,
          lastName: targetUser.lastName || telegramUser.lastName,
          phoneNumber: targetUser.phoneNumber || telegramUser.phoneNumber,
        },
      });
    });

    await this.sendMessageToUser(
      bot,
      telegramUser.chatId || '',
      `✅ Muvaffaqiyatli ulandi!\n\n` +
        `Hurmatli ${targetUser.firstName} ${targetUser.lastName}, sizning Telegram hisobingiz o'qituvchi profilingizga ulandi.`,
    );
  }

  /**
   * Handle course enrollment from link
   * TODO: Implement with actual Course model later
   */
  private async handleCourseEnrollment(
    bot: TelegramBotWithCenter,
    telegramUser: TelegramUserWithUser,
    courseToken: string,
  ) {
    this.logger.log(
      `User ${telegramUser.telegramId} trying to enroll in course ${courseToken}`,
    );

    // Mock: In real implementation, find course by token
    // const enrollment = await this.findCourseByToken(courseToken);

    // Mock course info
    const courseInfo =
      `📚 <b>Python Asoslari kursi</b>\n\n` +
      `👨‍🏫 <b>O'qituvchi:</b> Alisher Karimov\n` +
      `📅 <b>Boshlanish:</b> 2024-02-01\n` +
      `⏰ <b>Davomiyligi:</b> 3 oy\n` +
      `💰 <b>Narx:</b> 500,000 so'm\n\n` +
      `📝 <b>Tavsif:</b>\n` +
      `Python dasturlash tilining asoslarini o'rganasiz. ` +
      `Kursda amaliy mashg'ulotlar va real loyihalar ustida ishlaymiz.\n\n`;

    // Get payment cards for this center
    const paymentCards = await this.prisma.centerPaymentCard.findMany({
      where: {
        centerId: bot.centerId,
        isVisible: true,
        isActive: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
    });

    let paymentInfo = '';
    if (paymentCards && paymentCards.length > 0) {
      paymentInfo = `💳 <b>To'lov uchun kartalar:</b>\n\n`;

      for (const card of paymentCards) {
        paymentInfo += `${card.isPrimary ? '⭐ ' : ''}Karta: <code>${card.cardNumber}</code>\n`;
        paymentInfo += `${card.cardHolder}\n`;
        if (card.bankName) {
          paymentInfo += `Bank: ${card.bankName}\n`;
        }
        if (card.description) {
          paymentInfo += `${card.description}\n`;
        }
        paymentInfo += `\n`;
      }

      paymentInfo += `${bot.paymentInstruction || "To'lov qilganingizdan keyin chek rasmini yuboring."}`;
    } else {
      paymentInfo = "To'lov ma'lumotlari hali sozlanmagan.";
    }

    const keyboard = this.telegramApi.buildInlineKeyboard([
      [
        {
          text: '📸 Chek Yuborish',
          callback_data: `send_receipt:${courseToken}`,
        },
      ],
      [
        {
          text: '❌ Bekor qilish',
          callback_data: `cancel_enrollment:${courseToken}`,
        },
      ],
    ]);

    await this.sendMessageToUser(
      bot,
      telegramUser.chatId || '',
      courseInfo + paymentInfo,
      {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      },
    );

    // TODO: Create enrollment record with status PENDING_PAYMENT
    // await this.createEnrollment(telegramUser.id, courseId, 'PENDING');
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
    // TODO: Get actual courses from database
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

    try {
      // Create new User and Student in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Create User with STUDENT role
        const newUser = await tx.user.create({
          data: {
            firstName: freshTelegramUser.firstName || '',
            lastName,
            phoneNumber: freshTelegramUser.phoneNumber as string,
            password, // In production, should be hashed
            userType: UserType.STUDENT,
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

    let groupList = `✅ Rahmat, ${name}!\\n\\n📚 Mavjud guruhlar:\\n\\n`;
    groups.forEach((group, index) => {
      groupList += `${index + 1}. ${group.name}\\n`;
      groupList += `   💰 Narx: ${group.monthlyPrice} so'm/oy\\n`;
      if (group.description) {
        groupList += `   📝 ${group.description}\\n`;
      }
      groupList += `\\n`;
    });

    groupList += `\\nGuruh raqamini kiriting (1-${groups.length}):`;

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
    let paymentOptions = `✅ Siz tanladingiz: ${selectedGroup.name}\\n\\n`;
    paymentOptions += `💰 To'lov variantlari:\\n\\n`;
    paymentOptions += `1. 1 oy - ${selectedGroup.monthlyPrice} so'm\\n`;

    // Add multi-month options with discounts
    selectedGroup.groupDiscounts.forEach((discount, index) => {
      const totalPrice =
        Number(selectedGroup.monthlyPrice) * discount.months -
        Number(discount.discountAmount);
      paymentOptions += `${index + 2}. ${discount.months} oy - ${totalPrice} so'm `;
      paymentOptions += `(${discount.discountAmount} so'm chegirma!)\\n`;
    });

    paymentOptions += `\\nTo'lov turini tanlang (1-${1 + selectedGroup.groupDiscounts.length}):`;

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

    let paymentInfo = `✅ To'lov: ${months} oy - ${amount} so'm\\n\\n`;

    if (paymentCards && paymentCards.length > 0) {
      paymentInfo += `💳 To'lov uchun kartalar:\\n\\n`;

      for (const card of paymentCards) {
        paymentInfo += `${card.isPrimary ? '⭐ ' : ''}${card.cardNumber}\\n`;
        paymentInfo += `${card.cardHolder}\\n`;
        if (card.bankName) {
          paymentInfo += `Bank: ${card.bankName}\\n`;
        }
        paymentInfo += `\\n`;
      }

      paymentInfo += `\\nTo'lov chekini rasmda yuboring 📸`;
    } else {
      paymentInfo += `\\nIltimos, admin bilan bog'laning.`;
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
        notes: `Receipt URL: ${fileUrl}\\nMonths: ${months}\\nCaption: ${message.caption || 'N/A'}`,
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
      '✅ Chek qabul qilindi!\\n\\n' +
        `To'lovingiz tekshirilmoqda (${amount} so'm, ${months} oy).\\n` +
        'Tasdiqlangandan keyin sizga xabar beramiz.\\n\\n' +
        "Yangi guruhga yozilish uchun /start buyrug'ini yuboring.",
    );

    this.logger.log(
      `Payment receipt processed for user ${telegramUser.telegramId}, payment ID: ${payment.id}`,
    );

    // TODO: Notify admins about new payment receipt via WebSocket or telegram
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
}
