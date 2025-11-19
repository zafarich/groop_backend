import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CenterBotModule } from '../center-bot/center-bot.module';
import { PaymentCardModule } from '../payment-card/payment-card.module';

@Module({
  imports: [PrismaModule, CenterBotModule, PaymentCardModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
