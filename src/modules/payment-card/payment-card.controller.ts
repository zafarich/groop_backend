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
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { PaymentCardService } from './payment-card.service';
import { CreatePaymentCardDto, UpdatePaymentCardDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CenterOwnershipGuard } from '../../common/guards/center-ownership.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CheckCenterOwnership } from '../../common/decorators/check-center-ownership.decorator';
import { ActiveCenterId } from '../../common/decorators/active-center.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('payment-cards')
@UseGuards(JwtAuthGuard, PermissionsGuard, CenterOwnershipGuard)
export class PaymentCardController {
  constructor(private readonly paymentCardService: PaymentCardService) {}

  /**
   * Create a new payment card
   */
  @Post()
  @RequirePermissions('center.manage')
  create(
    @Body() createPaymentCardDto: CreatePaymentCardDto,
    @ActiveCenterId() activeCenterId: number,
  ) {
    return this.paymentCardService.create(createPaymentCardDto, activeCenterId);
  }

  /**
   * Get all payment cards (admin)
   */
  @Get()
  @RequirePermissions('center.read')
  findAll(
    @ActiveCenterId() activeCenterId: number,
    @Query('includeHidden') includeHidden?: string,
  ) {
    const showHidden = includeHidden === 'true';
    return this.paymentCardService.findAll(activeCenterId, showHidden);
  }

  /**
   * Get visible payment cards for a center (public endpoint)
   */
  @Get('visible/:centerId')
  @Public()
  findVisibleByCenter(@Param('centerId', ParseIntPipe) centerId: number) {
    return this.paymentCardService.findVisibleByCenter(centerId);
  }

  /**
   * Get primary payment card for a center (public endpoint)
   */
  @Get('primary/:centerId')
  @Public()
  findPrimaryByCenter(@Param('centerId', ParseIntPipe) centerId: number) {
    return this.paymentCardService.findPrimaryByCenter(centerId);
  }

  /**
   * Get a single payment card
   */
  @Get(':id')
  @RequirePermissions('center.read')
  @CheckCenterOwnership({ resourceName: 'payment-card' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentCardService.findOne(id);
  }

  /**
   * Update a payment card
   */
  @Patch(':id')
  @RequirePermissions('center.manage')
  @CheckCenterOwnership({ resourceName: 'payment-card' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePaymentCardDto: UpdatePaymentCardDto,
  ) {
    return this.paymentCardService.update(id, updatePaymentCardDto);
  }

  /**
   * Set a card as primary
   */
  @Patch(':id/set-primary')
  @RequirePermissions('center.manage')
  @CheckCenterOwnership({ resourceName: 'payment-card' })
  @HttpCode(HttpStatus.OK)
  setPrimary(@Param('id', ParseIntPipe) id: number) {
    return this.paymentCardService.setPrimary(id);
  }

  /**
   * Toggle card visibility
   */
  @Patch(':id/toggle-visibility')
  @RequirePermissions('center.manage')
  @CheckCenterOwnership({ resourceName: 'payment-card' })
  @HttpCode(HttpStatus.OK)
  toggleVisibility(@Param('id', ParseIntPipe) id: number) {
    return this.paymentCardService.toggleVisibility(id);
  }

  /**
   * Soft delete (hide) a payment card
   */
  @Delete(':id/soft')
  @RequirePermissions('center.manage')
  @CheckCenterOwnership({ resourceName: 'payment-card' })
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.paymentCardService.softDelete(id);
  }

  /**
   * Hard delete a payment card
   */
  @Delete(':id')
  @RequirePermissions('center.manage')
  @CheckCenterOwnership({ resourceName: 'payment-card' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentCardService.remove(id);
  }

  /**
   * Reorder cards
   */
  @Post('reorder')
  @RequirePermissions('center.manage')
  @HttpCode(HttpStatus.OK)
  reorder(
    @ActiveCenterId() activeCenterId: number,
    @Body() body: { cardIds: number[] },
  ) {
    return this.paymentCardService.reorder(activeCenterId, body.cardIds);
  }
}
