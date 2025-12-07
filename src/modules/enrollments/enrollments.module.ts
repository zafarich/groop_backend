import { Module, forwardRef } from '@nestjs/common';
import {
  EnrollmentsController,
  GroupEnrollmentsController,
} from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [PrismaModule, forwardRef(() => TelegramModule)],
  controllers: [EnrollmentsController, GroupEnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
