import { Module } from '@nestjs/common';
import { PaymentCardService } from './payment-card.service';
import { PaymentCardController } from './payment-card.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentCardController],
  providers: [PaymentCardService],
  exports: [PaymentCardService],
})
export class PaymentCardModule {}

