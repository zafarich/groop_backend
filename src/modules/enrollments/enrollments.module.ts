import { Module } from '@nestjs/common';
import {
  EnrollmentsController,
  GroupEnrollmentsController,
} from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EnrollmentsController, GroupEnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
