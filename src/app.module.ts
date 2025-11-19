import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { PermissionModule } from './modules/permission/permission.module';
import { CenterModule } from './modules/center/center.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { CenterBotModule } from './modules/center-bot/center-bot.module';
import { PlanModule } from './modules/plan/plan.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { PaymentCardModule } from './modules/payment-card/payment-card.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    RoleModule,
    PermissionModule,
    CenterModule,
    TelegramModule,
    CenterBotModule,
    PlanModule,
    SubscriptionModule,
    PaymentCardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
