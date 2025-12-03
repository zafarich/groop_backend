import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { PriceCalculatorService } from './services/price-calculator.service';
import { BotPermissionsService } from './services/bot-permissions.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CenterBotModule } from '../center-bot/center-bot.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, CenterBotModule, EventsModule],
  controllers: [GroupsController],
  providers: [GroupsService, PriceCalculatorService, BotPermissionsService],
  exports: [GroupsService, PriceCalculatorService],
})
export class GroupsModule {}
