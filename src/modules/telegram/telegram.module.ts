import { Module, forwardRef } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CenterBotModule } from '../center-bot/center-bot.module';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [PrismaModule, CenterBotModule, forwardRef(() => GroupsModule)],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
