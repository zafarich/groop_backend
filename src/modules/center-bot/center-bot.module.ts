import { Module } from '@nestjs/common';
import { CenterBotService } from './center-bot.service';
import { CenterBotController } from './center-bot.controller';
import { TelegramApiService } from './telegram-api.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CenterBotController],
  providers: [CenterBotService, TelegramApiService],
  exports: [CenterBotService, TelegramApiService],
})
export class CenterBotModule {}

