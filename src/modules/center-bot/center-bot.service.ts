import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TelegramApiService } from './telegram-api.service';
import { CreateCenterBotDto, UpdateCenterBotDto } from './dto';
import * as crypto from 'crypto';

@Injectable()
export class CenterBotService {
  private readonly logger = new Logger(CenterBotService.name);

  constructor(
    private prisma: PrismaService,
    private telegramApi: TelegramApiService,
  ) {}

  async create(createCenterBotDto: CreateCenterBotDto, activeCenterId: number) {
    const { botToken, ...rest } = createCenterBotDto;

    // Use activeCenterId if centerId is not provided in DTO
    const targetCenterId = activeCenterId;

    // Check if center exists
    const center = await this.prisma.center.findUnique({
      where: { id: targetCenterId },
    });

    if (!center) {
      throw new BadRequestException('Center not found');
    }

    // Check if center already has a bot
    const existingCenterBot = await this.prisma.centerTelegramBot.findFirst({
      where: { centerId: targetCenterId },
    });

    if (existingCenterBot) {
      throw new ConflictException(
        'Center already has a telegram bot. Each center can only have one bot.',
      );
    }

    // Check if bot token already exists
    const existingBot = await this.prisma.centerTelegramBot.findUnique({
      where: { botToken },
    });

    if (existingBot) {
      throw new ConflictException('Bot with this token already exists');
    }

    // Verify bot token with Telegram
    const botInfo = await this.telegramApi.getMe(botToken);

    if (!botInfo.ok) {
      throw new BadRequestException(`Bot token xato: ${botInfo.description}`);
    }

    // Generate secret token
    const secretToken = this.generateSecretToken();

    // Create bot in database
    const bot = await this.prisma.centerTelegramBot.create({
      data: {
        centerId: targetCenterId,
        botToken,
        botUsername: botInfo.result.username,
        secretToken,
        ...rest,
      },
      include: {
        center: true,
      },
    });

    // Setup webhook
    const webhookUrl = this.buildWebhookUrl(bot.id, secretToken);

    try {
      const webhookResult = await this.telegramApi.setWebhook(
        botToken,
        webhookUrl,
        process.env.TELEGRAM_WEBHOOK_SECRET,
      );

      if (webhookResult.ok) {
        // Update bot with webhook URL and timestamp
        await this.prisma.centerTelegramBot.update({
          where: { id: bot.id },
          data: {
            webhookUrl,
            webhookSetAt: new Date(),
          },
        });

        this.logger.log(`Webhook set for bot ${bot.id}: ${webhookUrl}`);
      } else {
        this.logger.error(
          `Failed to set webhook for bot ${bot.id}: ${webhookResult.description}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error setting webhook: ${error.message}`);
    }

    return this.findOne(bot.id);
  }

  async findAll(centerId: number) {
    return this.prisma.centerTelegramBot.findMany({
      where: { centerId },
      include: {
        center: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const bot = await this.prisma.centerTelegramBot.findUnique({
      where: { id },
      include: {
        center: true,
      },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // Hide sensitive data
    return {
      ...bot,
      botToken: this.maskToken(bot.botToken),
      secretToken: this.maskToken(bot.secretToken),
    };
  }

  async findOneInternal(id: number) {
    const bot = await this.prisma.centerTelegramBot.findUnique({
      where: { id },
      include: {
        center: true,
      },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    return bot;
  }

  async findBySecretToken(botId: number, secretToken: string) {
    const bot = await this.prisma.centerTelegramBot.findFirst({
      where: {
        id: botId,
        secretToken,
        isActive: true,
      },
      include: {
        center: true,
      },
    });

    return bot;
  }

  async findByBotToken(botToken: string) {
    const bot = await this.prisma.centerTelegramBot.findUnique({
      where: { botToken },
      include: {
        center: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // Return bot info with masked sensitive data
    return {
      ...bot,
      botToken: this.maskToken(bot.botToken),
      secretToken: this.maskToken(bot.secretToken),
    };
  }

  async findByCenterId(centerId: number) {
    const bot = await this.prisma.centerTelegramBot.findFirst({
      where: { centerId },
      include: {
        center: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!bot) {
      return {
        success: false,
        code: 404,
        data: null,
        message: 'No bot found for this center',
      };
    }

    // Return bot info with masked sensitive data
    return {
      ...bot,
      botToken: this.maskToken(bot.botToken),
      secretToken: this.maskToken(bot.secretToken),
    };
  }

  async update(id: number, updateCenterBotDto: UpdateCenterBotDto) {
    const bot = await this.prisma.centerTelegramBot.findUnique({
      where: { id },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // If bot token is being updated, verify it and update webhook
    if (
      updateCenterBotDto.botToken &&
      updateCenterBotDto.botToken !== bot.botToken
    ) {
      const botInfo = await this.telegramApi.getMe(updateCenterBotDto.botToken);

      if (!botInfo.ok) {
        throw new BadRequestException(`Bot token xato: ${botInfo.description}`);
      }

      // Check if new token already exists
      const existingBot = await this.prisma.centerTelegramBot.findUnique({
        where: { botToken: updateCenterBotDto.botToken },
      });

      if (existingBot && existingBot.id !== id) {
        throw new ConflictException('Bot with this token already exists');
      }

      // Delete old webhook
      await this.telegramApi.deleteWebhook(bot.botToken);

      // Set new webhook
      const webhookUrl = this.buildWebhookUrl(bot.id, bot.secretToken);
      await this.telegramApi.setWebhook(
        updateCenterBotDto.botToken,
        webhookUrl,
        process.env.TELEGRAM_WEBHOOK_SECRET,
      );

      updateCenterBotDto.botUsername = botInfo.result.username;
    }

    return this.prisma.centerTelegramBot.update({
      where: { id },
      data: updateCenterBotDto,
      include: {
        center: true,
      },
    });
  }

  async remove(id: number) {
    const bot = await this.prisma.centerTelegramBot.findUnique({
      where: { id },
    });

    if (!bot) {
      throw new NotFoundException('Bot not found');
    }

    // Delete webhook before removing bot
    try {
      await this.telegramApi.deleteWebhook(bot.botToken);
    } catch (error) {
      this.logger.error(`Error deleting webhook: ${error.message}`);
    }

    await this.prisma.centerTelegramBot.delete({
      where: { id },
    });

    return { message: 'Bot deleted successfully' };
  }

  async getWebhookInfo(id: number) {
    const bot = await this.findOneInternal(id);

    const webhookInfo = await this.telegramApi.getWebhookInfo(bot.botToken);

    return {
      bot: {
        id: bot.id,
        displayName: bot.displayName,
        botUsername: bot.botUsername,
      },
      webhook: webhookInfo.result,
    };
  }

  async resetWebhook(id: number) {
    const bot = await this.findOneInternal(id);

    // Delete old webhook
    await this.telegramApi.deleteWebhook(bot.botToken);

    // Generate new secret token
    const newSecretToken = this.generateSecretToken();

    // Set new webhook
    const webhookUrl = this.buildWebhookUrl(bot.id, newSecretToken);
    const result = await this.telegramApi.setWebhook(
      bot.botToken,
      webhookUrl,
      process.env.TELEGRAM_WEBHOOK_SECRET,
    );

    if (result.ok) {
      await this.prisma.centerTelegramBot.update({
        where: { id },
        data: {
          secretToken: newSecretToken,
          webhookUrl,
          webhookSetAt: new Date(),
        },
      });
    }

    return {
      success: result.ok,
      webhookUrl: result.ok ? webhookUrl : null,
      error: result.ok ? null : result.description,
    };
  }

  /**
   * Generate a secure secret token for Telegram webhook
   * Telegram requires: 1-256 characters, only A-Z, a-z, 0-9, _, -
   */
  private generateSecretToken(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    const length = 64; // Good length for security (256 bits of entropy)
    const randomBytes = crypto.randomBytes(length);

    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars[randomBytes[i] % chars.length];
    }

    return token;
  }

  private buildWebhookUrl(botId: number, secretToken: string): string {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/v1/telegram/webhook/bot/${botId}/${secretToken}`;
  }

  private maskToken(token: string): string {
    if (!token || token.length < 10) return '***';
    return `${token.substring(0, 5)}...${token.substring(token.length - 5)}`;
  }
}
