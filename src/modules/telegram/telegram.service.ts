import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TelegramApiService } from '../center-bot/telegram-api.service';
import {
  CreateTelegramUserDto,
  UpdateTelegramUserDto,
  TelegramWebhookUpdateDto,
} from './dto';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private prisma: PrismaService,
    private telegramApi: TelegramApiService,
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
      const linkedUser = await this.prisma.user.create({
        data: {
          firstName: rest.firstName,
          lastName: rest.lastName,
          phoneNumber: rest.phoneNumber,
          username: rest.username,
          centerId,
          userType: 'STUDENT',
          authProvider: 'telegram',
          telegramUserId: telegramUser.id,
          // No email/password for Telegram-only users
        },
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
    headers: any,
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
    if (
      process.env.TELEGRAM_WEBHOOK_SECRET &&
      telegramSecret !== process.env.TELEGRAM_WEBHOOK_SECRET
    ) {
      this.logger.warn(`Invalid Telegram secret for bot ${botId}`);
      throw new UnauthorizedException('Invalid Telegram secret');
    }

    try {
      // Handle different types of updates
      if (update.message) {
        await this.handleMessage(bot, update.message);
      }

      if (update.callback_query) {
        await this.handleCallbackQuery(bot, update.callback_query);
      }

      return { ok: true };
    } catch (error) {
      this.logger.error(`Error handling webhook: ${error.message}`);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(bot: any, message: any) {
    this.logger.log(
      `Handling message from ${message.from.id} for center ${bot.center.name}`,
    );

    const telegramId = message.from.id.toString();
    const chatId = message.chat.id.toString();

    // Upsert telegram user (globally unique by telegramId)
    let telegramUser = await this.prisma.telegramUser.findUnique({
      where: { telegramId },
      include: { user: true },
    });

    if (!telegramUser) {
      // Create new TelegramUser
      telegramUser = await this.prisma.telegramUser.create({
        data: {
          telegramId,
          centerId: bot.centerId,
          username: message.from.username,
          firstName: message.from.first_name,
          lastName: message.from.last_name,
          languageCode: message.from.language_code,
          chatId,
          isBot: message.from.is_bot || false,
          status: 'active',
        },
        include: { user: true },
      });

      // Auto-create linked User for students
      // Generate a default phone number from telegram ID if not available
      const defaultPhoneNumber = `998${telegramId.slice(-9).padStart(9, '0')}`;
      
      const linkedUser = await this.prisma.user.create({
        data: {
          firstName: message.from.first_name,
          lastName: message.from.last_name,
          username: message.from.username,
          phoneNumber: defaultPhoneNumber,
          centerId: bot.centerId,
          userType: 'STUDENT',
          authProvider: 'telegram',
          telegramUserId: telegramUser.id,
        },
      });

      this.logger.log(
        `Created new telegram user ${telegramId} and linked User ${linkedUser.id} for center ${bot.center.name}`,
      );

      // Reload with user relation
      telegramUser = await this.prisma.telegramUser.findUnique({
        where: { id: telegramUser.id },
        include: { user: true },
      });
    } else {
      // Update chat_id and centerId if changed
      const updateData: any = {};
      if (telegramUser.chatId !== chatId) {
        updateData.chatId = chatId;
      }
      if (!telegramUser.centerId && bot.centerId) {
        updateData.centerId = bot.centerId;
      }

      if (Object.keys(updateData).length > 0) {
        telegramUser = await this.prisma.telegramUser.update({
          where: { id: telegramUser.id },
          data: updateData,
          include: { user: true },
        });
      }

      // Create linked User if doesn't exist
      if (!telegramUser.user && bot.centerId) {
        // Generate a default phone number from telegram ID if not available
        const defaultPhoneNumber = telegramUser.phoneNumber || `998${telegramId.slice(-9).padStart(9, '0')}`;
        
        const linkedUser = await this.prisma.user.create({
          data: {
            firstName: telegramUser.firstName,
            lastName: telegramUser.lastName,
            username: telegramUser.username,
            phoneNumber: defaultPhoneNumber,
            centerId: bot.centerId,
            userType: 'STUDENT',
            authProvider: 'telegram',
            telegramUserId: telegramUser.id,
          },
        });

        this.logger.log(
          `Created linked User ${linkedUser.id} for existing TelegramUser ${telegramUser.id}`,
        );

        telegramUser = await this.prisma.telegramUser.findUnique({
          where: { id: telegramUser.id },
          include: { user: true },
        });
      }
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
   * Handle callback queries (inline button clicks)
   */
  private async handleCallbackQuery(bot: any, callbackQuery: any) {
    this.logger.log(`Handling callback query: ${callbackQuery.data}`);

    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;

    // Answer callback query immediately
    await this.telegramApi.answerCallbackQuery(
      bot.botToken,
      callbackQuery.id,
      'Ma\'lumot qabul qilindi',
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
  private async processTextMessage(bot: any, telegramUser: any, text: string) {
    this.logger.log(`Processing text message: ${text}`);

    // Handle commands
    if (text.startsWith('/')) {
      const [command, ...params] = text.split(' ');

      switch (command.toLowerCase()) {
        case '/start':
          await this.handleStartCommand(bot, telegramUser, params[0]);
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
            telegramUser.chatId,
            'Noma\'lum buyruq. /help ni bosing.',
          );
      }
    } else {
      // Handle regular messages (possible user inputs)
      await this.handleRegularMessage(bot, telegramUser, text);
    }
  }

  /**
   * Handle /start command
   */
  private async handleStartCommand(
    bot: any,
    telegramUser: any,
    param?: string,
  ) {
    // Parse start parameter (e.g., /start course_ABC123)
    if (param && param.startsWith('course_')) {
      const courseToken = param.replace('course_', '');
      await this.handleCourseEnrollment(bot, telegramUser, courseToken);
      return;
    }

    // Default welcome message
    const welcomeMessage =
      bot.welcomeMessage ||
      `Assalomu alaykum! ${bot.center.name} o'quv markazi botiga xush kelibsiz! 👋\n\n` +
        `Kurslarimiz haqida ma'lumot olish uchun /menu buyrug'ini yuboring.`;

    await this.sendMessageToUser(bot, telegramUser.chatId, welcomeMessage);
  }

  /**
   * Handle course enrollment from link
   * TODO: Implement with actual Course model later
   */
  private async handleCourseEnrollment(
    bot: any,
    telegramUser: any,
    courseToken: string,
  ) {
    this.logger.log(
      `User ${telegramUser.telegramId} trying to enroll in course ${courseToken}`,
    );

    // Mock: In real implementation, find course by token
    // const enrollment = await this.findCourseByToken(courseToken);

    // Mock course info
    const courseInfo = `📚 <b>Python Asoslari kursi</b>\n\n` +
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
      
      paymentInfo += `${bot.paymentInstruction || 'To\'lov qilganingizdan keyin chek rasmini yuboring.'}`;
    } else {
      paymentInfo = 'To\'lov ma\'lumotlari hali sozlanmagan.';
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
      telegramUser.chatId,
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
  private async handleHelpCommand(bot: any, telegramUser: any) {
    const helpText =
      `<b>Yordam:</b>\n\n` +
      `/start - Botni ishga tushirish\n` +
      `/menu - Kurslar ro'yxati\n` +
      `/help - Yordam\n\n` +
      `Savollar bo'lsa, bizga murojaat qiling: ${bot.center.name}`;

    await this.sendMessageToUser(bot, telegramUser.chatId, helpText, {
      parse_mode: 'HTML',
    });
  }

  /**
   * Handle /menu command
   */
  private async handleMenuCommand(bot: any, telegramUser: any) {
    // TODO: Get actual courses from database
    const menuText =
      `<b>${bot.center.name}</b>\n\n` +
      `<b>Mavjud kurslar:</b>\n\n` +
      `📚 Hozircha kurslar mavjud emas.\n\n` +
      `Tez orada yangi kurslar qo'shiladi!`;

    await this.sendMessageToUser(bot, telegramUser.chatId, menuText, {
      parse_mode: 'HTML',
    });
  }

  /**
   * Handle regular text messages
   */
  private async handleRegularMessage(
    bot: any,
    telegramUser: any,
    text: string,
  ) {
    // Check if user is in some state (e.g., waiting for input)
    // For now, just echo back
    this.logger.log(
      `Regular message from ${telegramUser.telegramId}: ${text}`,
    );
  }

  /**
   * Handle photo messages (payment receipt)
   */
  private async handlePhotoMessage(bot: any, telegramUser: any, message: any) {
    this.logger.log(
      `Received photo from ${telegramUser.telegramId} for center ${bot.center.name}`,
    );

    const photo = message.photo[message.photo.length - 1]; // Get largest photo
    const fileId = photo.file_id;
    const caption = message.caption || '';

    // Get file info
    const fileInfo = await this.telegramApi.getFile(bot.botToken, fileId);

    if (fileInfo.ok) {
      const fileUrl = this.telegramApi.getFileUrl(
        bot.botToken,
        fileInfo.result.file_path,
      );

      this.logger.log(`Payment receipt file URL: ${fileUrl}`);

      // TODO: Save receipt to database and notify admin
      // await this.savePaymentReceipt(telegramUser.id, fileUrl, caption);

      await this.sendMessageToUser(
        bot,
        telegramUser.chatId,
        '✅ Chek qabul qilindi!\n\n' +
          'To\'lovingiz tekshirilmoqda. Tasdiqlangandan keyin sizga xabar beramiz.',
      );

      // TODO: Notify admins about new payment receipt
    }
  }

  /**
   * Handle "Send Receipt" button
   */
  private async handleSendReceiptButton(
    bot: any,
    chatId: number,
    params: string[],
  ) {
    const courseToken = params[0];

    await this.sendMessageToUser(
      bot,
      chatId,
      '📸 Iltimos, to\'lov chekining rasmini yuboring.\n\n' +
        'Rasmda summа va sana aniq ko\'rinishi kerak.',
    );

    // TODO: Set user state to "WAITING_FOR_RECEIPT"
  }

  /**
   * Handle "Cancel Enrollment" button
   */
  private async handleCancelEnrollment(
    bot: any,
    chatId: number,
    params: string[],
  ) {
    const courseToken = params[0];

    await this.sendMessageToUser(
      bot,
      chatId,
      '❌ Kursga yozilish bekor qilindi.\n\n' + 'Yana ro\'yxatdan o\'tish uchun havolani bosing.',
    );

    // TODO: Delete enrollment record if exists
  }

  /**
   * Send message to user through bot
   */
  private async sendMessageToUser(
    bot: any,
    chatId: string | number,
    text: string,
    options?: any,
  ) {
    return this.telegramApi.sendMessage(bot.botToken, chatId, text, options);
  }

}
