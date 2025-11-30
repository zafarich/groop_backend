import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CenterBotService } from './center-bot.service';
import { CreateCenterBotDto, UpdateCenterBotDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CenterOwnershipGuard } from '../../common/guards/center-ownership.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CheckCenterOwnership } from '../../common/decorators/check-center-ownership.decorator';
import { ActiveCenterId } from '../../common/decorators/active-center.decorator';

@Controller('center-bots')
@UseGuards(JwtAuthGuard, PermissionsGuard, CenterOwnershipGuard)
export class CenterBotController {
  constructor(private readonly centerBotService: CenterBotService) {}

  @Post()
  @RequirePermissions('telegram.manage')
  create(
    @Body() createCenterBotDto: CreateCenterBotDto,
    @ActiveCenterId() activeCenterId: number,
  ) {
    return this.centerBotService.create(createCenterBotDto, activeCenterId);
  }

  @Get()
  @RequirePermissions('center.read')
  findAll(@ActiveCenterId() activeCenterId: number) {
    return this.centerBotService.findAll(activeCenterId);
  }

  @Get('my-bot')
  @RequirePermissions('center.read')
  getMyBot(@ActiveCenterId() activeCenterId: number) {
    return this.centerBotService.findByCenterId(activeCenterId);
  }

  @Patch(':id')
  @RequirePermissions('center.manage', 'telegram.manage')
  @CheckCenterOwnership({ resourceName: 'center-bot' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCenterBotDto: UpdateCenterBotDto,
  ) {
    return this.centerBotService.update(id, updateCenterBotDto);
  }

  @Get(':id')
  @RequirePermissions('center.read')
  @CheckCenterOwnership({ resourceName: 'center-bot' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.centerBotService.findOne(id);
  }

  @Get(':id/webhook-info')
  @RequirePermissions('center.manage', 'telegram.manage')
  @CheckCenterOwnership({ resourceName: 'center-bot' })
  getWebhookInfo(@Param('id', ParseIntPipe) id: number) {
    return this.centerBotService.getWebhookInfo(id);
  }

  @Post(':id/reset-webhook')
  @RequirePermissions('center.manage', 'telegram.manage')
  @CheckCenterOwnership({ resourceName: 'center-bot' })
  resetWebhook(@Param('id', ParseIntPipe) id: number) {
    return this.centerBotService.resetWebhook(id);
  }

  @Delete(':id')
  @RequirePermissions('center.manage', 'telegram.manage')
  @CheckCenterOwnership({ resourceName: 'center-bot' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.centerBotService.remove(id);
  }
}
