import { BadRequestException, Injectable, Logger } from '@nestjs/common';

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
}

interface SendMessageOptions {
  parse_mode?: 'Markdown' | 'HTML';
  reply_markup?: any;
  disable_web_page_preview?: boolean;
}

@Injectable()
export class TelegramApiService {
  private readonly logger = new Logger(TelegramApiService.name);

  /**
   * Validate secret token format for Telegram
   * Must be 1-256 characters, only A-Z, a-z, 0-9, _, -
   */
  private isValidSecretToken(token: string): boolean {
    return (
      !!token &&
      token.length >= 1 &&
      token.length <= 256 &&
      /^[A-Za-z0-9_-]+$/.test(token)
    );
  }

  /**
   * Set webhook for bot
   */
  async setWebhook(
    botToken: string,
    webhookUrl: string,
    secretToken?: string,
  ): Promise<TelegramResponse> {
    const url = `https://api.telegram.org/bot${botToken}/setWebhook`;

    // Validate secret token format if provided
    if (secretToken && !this.isValidSecretToken(secretToken)) {
      const errorMsg = `Invalid secret token format. Must be 1-256 characters, only A-Z, a-z, 0-9, _, -. Got: "${secretToken}"`;
      this.logger.error(errorMsg);
      throw new BadRequestException(errorMsg);
    }

    try {
      const body: any = {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query', 'my_chat_member'],
        drop_pending_updates: true,
      };

      // Only add secret_token if it's valid
      if (secretToken && this.isValidSecretToken(secretToken)) {
        body.secret_token = secretToken;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!data.ok) {
        this.logger.error(`Telegram setWebhook failed: ${data.description}`);
      } else {
        this.logger.log(`Webhook set successfully for: ${webhookUrl}`);
      }

      return data;
    } catch (error) {
      this.logger.error(`Error setting webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(botToken: string): Promise<TelegramResponse> {
    const url = `https://api.telegram.org/bot${botToken}/deleteWebhook`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drop_pending_updates: true }),
      });

      return await response.json();
    } catch (error) {
      this.logger.error(`Error deleting webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(botToken: string): Promise<TelegramResponse> {
    const url = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;

    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      this.logger.error(`Error getting webhook info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get bot info
   */
  async getMe(botToken: string): Promise<TelegramResponse> {
    const url = `https://api.telegram.org/bot${botToken}/getMe`;

    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      this.logger.error(`Error getting bot info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send message to user
   */
  async sendMessage(
    botToken: string,
    chatId: string | number,
    text: string,
    options?: SendMessageOptions,
  ): Promise<TelegramResponse> {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          ...options,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        this.logger.error(
          `Failed to send message to ${chatId}: ${data.description}`,
        );
      }

      return data;
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send photo to user
   */
  async sendPhoto(
    botToken: string,
    chatId: string | number,
    photo: string,
    caption?: string,
    options?: any,
  ): Promise<TelegramResponse> {
    const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo,
          caption,
          ...options,
        }),
      });

      return await response.json();
    } catch (error) {
      this.logger.error(`Error sending photo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Edit message text
   */
  async editMessageText(
    botToken: string,
    chatId: string | number,
    messageId: number,
    text: string,
    options?: SendMessageOptions,
  ): Promise<TelegramResponse> {
    const url = `https://api.telegram.org/bot${botToken}/editMessageText`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
          ...options,
        }),
      });

      return await response.json();
    } catch (error) {
      this.logger.error(`Error editing message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Answer callback query
   */
  async answerCallbackQuery(
    botToken: string,
    callbackQueryId: string,
    text?: string,
    showAlert?: boolean,
  ): Promise<TelegramResponse> {
    const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
          show_alert: showAlert,
        }),
      });

      return await response.json();
    } catch (error) {
      this.logger.error(`Error answering callback query: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create chat invite link
   */
  async createChatInviteLink(
    botToken: string,
    chatId: string | number,
    options?: {
      name?: string;
      expire_date?: number;
      member_limit?: number;
      creates_join_request?: boolean;
    },
  ): Promise<TelegramResponse> {
    const url = `https://api.telegram.org/bot${botToken}/createChatInviteLink`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          ...options,
        }),
      });

      return await response.json();
    } catch (error) {
      this.logger.error(`Error creating invite link: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get chat member info (for checking bot permissions)
   */
  async getChatMember(
    botToken: string,
    chatId: string | number,
    userId: number,
  ): Promise<TelegramResponse> {
    const url = `https://api.telegram.org/bot${botToken}/getChatMember`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          user_id: userId,
        }),
      });

      return await response.json();
    } catch (error) {
      this.logger.error(`Error getting chat member: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retry helper with incremental delay
   * @param fn - Function to retry
   * @param attempts - Number of attempts (default: 3)
   * @param delayMs - Initial delay in milliseconds (default: 500)
   * @returns Result from the function
   */
  async retryWithDelay<T>(
    fn: () => Promise<T>,
    attempts: number = 3,
    delayMs: number = 500,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Attempt ${i + 1}/${attempts} failed: ${lastError.message}`,
        );

        // If not last attempt, wait before retrying
        if (i < attempts - 1) {
          const currentDelay = delayMs * (i + 1); // Incremental delay
          this.logger.debug(`Waiting ${currentDelay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, currentDelay));
        }
      }
    }

    // All attempts failed
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Get file
   */
  async getFile(botToken: string, fileId: string): Promise<TelegramResponse> {
    const url = `https://api.telegram.org/bot${botToken}/getFile`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId }),
      });

      return await response.json();
    } catch (error) {
      this.logger.error(`Error getting file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get file download URL
   */
  getFileUrl(botToken: string, filePath: string): string {
    return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  }

  /**
   * Download file from Telegram
   */
  async downloadFile(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error(`Error downloading file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build inline keyboard
   */
  buildInlineKeyboard(
    buttons: Array<
      Array<{ text: string; callback_data?: string; url?: string }>
    >,
  ) {
    return {
      inline_keyboard: buttons,
    };
  }

  /**
   * Build reply keyboard (for contact request, etc.)
   */
  buildReplyKeyboard(
    buttons: Array<
      Array<{
        text: string;
        request_contact?: boolean;
        request_location?: boolean;
      }>
    >,
    options?: {
      resize_keyboard?: boolean;
      one_time_keyboard?: boolean;
    },
  ) {
    return {
      keyboard: buttons,
      resize_keyboard: options?.resize_keyboard ?? true,
      one_time_keyboard: options?.one_time_keyboard ?? true,
    };
  }

  /**
   * Remove reply keyboard
   */
  buildRemoveKeyboard() {
    return {
      remove_keyboard: true,
    };
  }
}
