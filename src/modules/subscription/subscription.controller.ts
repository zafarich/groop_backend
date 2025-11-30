import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CenterOwnershipGuard } from '../../common/guards/center-ownership.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CheckCenterOwnership } from '../../common/decorators/check-center-ownership.decorator';
import { ActiveCenterId } from '../../common/decorators/active-center.decorator';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, PermissionsGuard, CenterOwnershipGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @RequirePermissions('subscription.create')
  create(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @ActiveCenterId() activeCenterId: number,
  ) {
    return this.subscriptionService.create(
      createSubscriptionDto,
      activeCenterId,
    );
  }

  @Get()
  @RequirePermissions('subscription.read')
  findAll(
    @ActiveCenterId() activeCenterId: number,
    @Query('status') status?: string,
  ) {
    return this.subscriptionService.findAll(activeCenterId, status);
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
  @CheckCenterOwnership({ resourceName: 'subscription' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('subscription.update')
  @CheckCenterOwnership({ resourceName: 'subscription' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionService.update(id, updateSubscriptionDto);
  }

  @Post(':id/cancel')
  @RequirePermissions('subscription.cancel')
  @CheckCenterOwnership({ resourceName: 'subscription' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { immediately?: boolean },
  ) {
    return this.subscriptionService.cancel(id, body.immediately);
  }

  @Post(':id/reactivate')
  @RequirePermissions('subscription.manage')
  @CheckCenterOwnership({ resourceName: 'subscription' })
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionService.reactivate(id);
  }
}
