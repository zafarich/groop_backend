import { Module } from '@nestjs/common';
import { FreezeController } from './freeze.controller';
import { FreezeService } from './freeze.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [PrismaModule, TelegramModule],
  controllers: [FreezeController],
  providers: [FreezeService],
  exports: [FreezeService],
})
export class FreezeModule {}
