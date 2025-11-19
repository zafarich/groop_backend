import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CenterBotService } from './center-bot.service';
import { CreateCenterBotDto, UpdateCenterBotDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('center-bots')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CenterBotController {
  constructor(private readonly centerBotService: CenterBotService) {}

  @Post()
  @RequirePermissions('center.manage', 'telegram.manage')
  create(@Body() createCenterBotDto: CreateCenterBotDto) {
    return this.centerBotService.create(createCenterBotDto);
  }

  @Get()
  @RequirePermissions('center.read')
  findAll(@Query('centerId') centerId?: string) {
    return this.centerBotService.findAll(centerId);
  }

  @Get(':id')
  @RequirePermissions('center.read')
  findOne(@Param('id') id: string) {
    return this.centerBotService.findOne(id);
  }

  @Get(':id/webhook-info')
  @RequirePermissions('center.manage', 'telegram.manage')
  getWebhookInfo(@Param('id') id: string) {
    return this.centerBotService.getWebhookInfo(id);
  }

  @Post(':id/reset-webhook')
  @RequirePermissions('center.manage', 'telegram.manage')
  resetWebhook(@Param('id') id: string) {
    return this.centerBotService.resetWebhook(id);
  }

  @Patch(':id')
  @RequirePermissions('center.manage', 'telegram.manage')
  update(
    @Param('id') id: string,
    @Body() updateCenterBotDto: UpdateCenterBotDto,
  ) {
    return this.centerBotService.update(id, updateCenterBotDto);
  }

  @Delete(':id')
  @RequirePermissions('center.manage', 'telegram.manage')
  remove(@Param('id') id: string) {
    return this.centerBotService.remove(id);
  }
}

