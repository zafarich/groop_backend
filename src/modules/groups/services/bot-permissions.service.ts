import { Injectable, Logger } from '@nestjs/common';
import { TelegramApiService } from '../../center-bot/telegram-api.service';

export interface BotPermissionsCheck {
  hasAllPermissions: boolean;
  missingPermissions: string[];
  permissions: {
    can_manage_chat: boolean;
    can_invite_users: boolean;
    can_pin_messages: boolean;
    can_delete_messages: boolean;
  };
}

@Injectable()
export class BotPermissionsService {
  private readonly logger = new Logger(BotPermissionsService.name);

  // Required permissions for the bot to function properly
  private readonly REQUIRED_PERMISSIONS = [
    'can_manage_chat',
    'can_invite_users',
    'can_pin_messages',
    'can_delete_messages',
  ] as const;

  constructor(private telegramApi: TelegramApiService) {}

  /**
   * Check if bot has all required admin permissions in the chat
   * @param botToken - Telegram bot token
   * @param chatId - Telegram chat/group ID
   * @returns Permission check result with missing permissions
   */
  async checkBotPermissions(
    botToken: string,
    chatId: string | number,
  ): Promise<BotPermissionsCheck> {
    this.logger.log(`Checking bot permissions for chat ${chatId}`);

    try {
      // Get bot info to get bot user ID
      const botInfo = await this.telegramApi.getMe(botToken);
      if (!botInfo.ok || !botInfo.result) {
        throw new Error('Failed to get bot info');
      }

      const botUserId = botInfo.result.id;
      this.logger.debug(`Bot user ID: ${botUserId}`);

      // Get bot's chat member info (includes permissions)
      const chatMember = await this.telegramApi.getChatMember(
        botToken,
        chatId,
        botUserId,
      );

      if (!chatMember.ok || !chatMember.result) {
        throw new Error('Failed to get bot chat member info');
      }

      const member = chatMember.result;
      this.logger.debug(`Bot status in chat: ${member.status}`);

      // Bot must be an administrator
      if (member.status !== 'administrator' && member.status !== 'creator') {
        return {
          hasAllPermissions: false,
          missingPermissions: [...this.REQUIRED_PERMISSIONS],
          permissions: {
            can_manage_chat: false,
            can_invite_users: false,
            can_pin_messages: false,
            can_delete_messages: false,
          },
        };
      }

      // Check each required permission
      const permissions = {
        can_manage_chat: member.can_manage_chat || false,
        can_invite_users: member.can_invite_users || false,
        can_pin_messages: member.can_pin_messages || false,
        can_delete_messages: member.can_delete_messages || false,
      };

      const missingPermissions: string[] = [];
      for (const permission of this.REQUIRED_PERMISSIONS) {
        if (!permissions[permission]) {
          missingPermissions.push(permission);
        }
      }

      const hasAllPermissions = missingPermissions.length === 0;

      this.logger.log(
        `Permission check result: ${hasAllPermissions ? 'PASS' : 'FAIL'}`,
      );
      if (!hasAllPermissions) {
        this.logger.warn(
          `Missing permissions: ${missingPermissions.join(', ')}`,
        );
      }

      return {
        hasAllPermissions,
        missingPermissions,
        permissions,
      };
    } catch (error) {
      this.logger.error(
        `Error checking bot permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Generate user-friendly error message for missing permissions
   * @param missingPermissions - Array of missing permission names
   * @returns Formatted error message
   */
  generatePermissionErrorMessage(missingPermissions: string[]): string {
    if (missingPermissions.length === 0) {
      return '';
    }

    const permissionLabels: Record<string, string> = {
      can_manage_chat: 'Guruhni boshqarish (Manage Chat)',
      can_invite_users: 'Foydalanuvchilarni taklif qilish (Invite Users)',
      can_pin_messages: 'Xabarlarni mahkamlash (Pin Messages)',
      can_delete_messages: "Xabarlarni o'chirish (Delete Messages)",
    };

    const formattedPermissions = missingPermissions
      .map((p) => `• ${permissionLabels[p] || p}`)
      .join('\n');

    return (
      `❌ Botda adminlik huquqlari yetarli emas!\n\n` +
      `Quyidagi huquqlarni bering:\n${formattedPermissions}\n\n` +
      `Huquqlarni bergandan keyin qayta urinib ko'ring.`
    );
  }
}
