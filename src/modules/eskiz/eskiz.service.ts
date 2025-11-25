import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EskizService {
  private readonly logger = new Logger(EskizService.name);
  private token: string | null = null;
  private readonly baseUrl = 'https://notify.eskiz.uz/api';

  constructor() {}

  async sendSms(phoneNumber: string, message: string) {
    try {
      if (!this.token) {
        await this.login();
      }

      try {
        return await this.performSend(phoneNumber, message);
      } catch (error) {
        // If 401, token might be expired. Retry once.
        if (error.response?.status === 401) {
          this.logger.warn('Token expired, refreshing...');
          await this.login();
          return await this.performSend(phoneNumber, message);
        }
        throw error;
      }
    } catch (error) {
      this.logger.error(
        `Failed to send SMS to ${phoneNumber}: ${error.message}`,
        error.stack,
      );
      // Don't block the flow if SMS fails, but log it.
      // Or throw if it's critical. For now, let's throw to notify user.
      throw new InternalServerErrorException(
        'Failed to send SMS verification code',
      );
    }
  }

  private async performSend(phoneNumber: string, message: string) {
    const formData = new FormData();
    formData.append('mobile_phone', phoneNumber.replace('+', '')); // Ensure no plus sign if API expects just digits
    formData.append('message', message);
    formData.append('from', '4546');

    const response = await axios.post(
      `${this.baseUrl}/message/sms/send`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          // axios automatically sets Content-Type for FormData
        },
      },
    );

    return response.data;
  }

  private async login() {
    const email = process.env.ESKIZ_EMAIL;
    const password = process.env.ESKIZ_PASSWORD;

    if (!email || !password) {
      throw new InternalServerErrorException(
        'Eskiz credentials not configured',
      );
    }

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const response = await axios.post(`${this.baseUrl}/auth/login`, formData);

      if (response.data?.data?.token) {
        this.token = response.data.data.token;
        this.logger.log('Eskiz token obtained successfully');
      } else {
        throw new Error('No token in response');
      }
    } catch (error) {
      this.logger.error(`Eskiz login failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'SMS Service authentication failed',
      );
    }
  }
}
