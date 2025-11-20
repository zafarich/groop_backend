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
  ParseIntPipe
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @RequirePermissions('subscription.create')
  create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionService.create(createSubscriptionDto);
  }

  @Get()
  @RequirePermissions('subscription.read')
  findAll(
    @Query('centerId', new ParseIntPipe({ optional: true })) centerId?: number,
    @Query('status') status?: string,
  ) {
    return this.subscriptionService.findAll(centerId, status);
  }

  @Get('center/:centerId')
  @RequirePermissions('subscription.read')
  findByCenterId(@Param('centerId', ParseIntPipe) centerId: number) {
    return this.subscriptionService.findByCenterId(centerId);
  }

  @Get('center/:centerId/active')
  @RequirePermissions('subscription.read')
  getActiveSubscription(@Param('centerId', ParseIntPipe) centerId: number) {
    return this.subscriptionService.getActiveSubscription(centerId);
  }

  @Get('check-expired')
  @RequirePermissions('subscription.manage')
  checkAndUpdateExpiredSubscriptions() {
    return this.subscriptionService.checkAndUpdateExpiredSubscriptions();
  }

  @Get(':id')
  @RequirePermissions('subscription.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('subscription.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionService.update(id, updateSubscriptionDto);
  }

  @Post(':id/cancel')
  @RequirePermissions('subscription.cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { immediately?: boolean },
  ) {
    return this.subscriptionService.cancel(id, body.immediately);
  }

  @Post(':id/reactivate')
  @RequirePermissions('subscription.manage')
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionService.reactivate(id);
  }
}

