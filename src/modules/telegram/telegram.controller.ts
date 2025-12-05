import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  ParseIntPipe,
} from '@nestjs/common';
import { TelegramService } from './telegram.service';
import {
  CreateTelegramUserDto,
  UpdateTelegramUserDto,
  TelegramWebhookUpdateDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  /**
   * Webhook endpoint for Telegram updates (with bot ID and secret)
   * This endpoint should be public (no authentication)
   * URL format: /webhook/bot/:botId/:secretToken
   */
  @Public()
  @Post('webhook/bot/:botId/:secretToken')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('botId') botId: string,
    @Param('secretToken') secretToken: string,
    @Body() update: TelegramWebhookUpdateDto,
    @Headers() headers: any,
  ) {
    return this.telegramService.handleWebhook(
      botId,
      secretToken,
      update,
      headers,
    );
  }

  /**
   * CRUD operations for Telegram users
   */
  @Post('users')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('telegram.manage')
  create(@Body() createTelegramUserDto: CreateTelegramUserDto) {
    return this.telegramService.createTelegramUser(createTelegramUserDto);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('telegram.manage')
  findAll() {
    return this.telegramService.findAll();
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('telegram.manage')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.telegramService.findOne(id);
  }

  @Get('users/telegram/:telegramId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('telegram.manage')
  findByTelegramId(@Param('telegramId') telegramId: string) {
    return this.telegramService.findByTelegramId(telegramId);
  }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('telegram.manage')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTelegramUserDto: UpdateTelegramUserDto,
  ) {
    return this.telegramService.update(id, updateTelegramUserDto);
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('telegram.manage')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.telegramService.remove(id);
  }
}
