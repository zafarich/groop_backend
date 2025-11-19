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
} from '@nestjs/common';
import { PaymentCardService } from './payment-card.service';
import { CreatePaymentCardDto, UpdatePaymentCardDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('payment-cards')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentCardController {
  constructor(private readonly paymentCardService: PaymentCardService) {}

  /**
   * Create a new payment card
   */
  @Post()
  @RequirePermissions('center.manage')
  create(@Body() createPaymentCardDto: CreatePaymentCardDto) {
    return this.paymentCardService.create(createPaymentCardDto);
  }

  /**
   * Get all payment cards (admin)
   */
  @Get()
  @RequirePermissions('center.read')
  findAll(
    @Query('centerId') centerId?: string,
    @Query('includeHidden') includeHidden?: string,
  ) {
    const showHidden = includeHidden === 'true';
    return this.paymentCardService.findAll(centerId, showHidden);
  }

  /**
   * Get visible payment cards for a center (public endpoint)
   */
  @Get('visible/:centerId')
  @Public()
  findVisibleByCenter(@Param('centerId') centerId: string) {
    return this.paymentCardService.findVisibleByCenter(centerId);
  }

  /**
   * Get primary payment card for a center (public endpoint)
   */
  @Get('primary/:centerId')
  @Public()
  findPrimaryByCenter(@Param('centerId') centerId: string) {
    return this.paymentCardService.findPrimaryByCenter(centerId);
  }

  /**
   * Get a single payment card
   */
  @Get(':id')
  @RequirePermissions('center.read')
  findOne(@Param('id') id: string) {
    return this.paymentCardService.findOne(id);
  }

  /**
   * Update a payment card
   */
  @Patch(':id')
  @RequirePermissions('center.manage')
  update(
    @Param('id') id: string,
    @Body() updatePaymentCardDto: UpdatePaymentCardDto,
  ) {
    return this.paymentCardService.update(id, updatePaymentCardDto);
  }

  /**
   * Set a card as primary
   */
  @Patch(':id/set-primary')
  @RequirePermissions('center.manage')
  @HttpCode(HttpStatus.OK)
  setPrimary(@Param('id') id: string) {
    return this.paymentCardService.setPrimary(id);
  }

  /**
   * Toggle card visibility
   */
  @Patch(':id/toggle-visibility')
  @RequirePermissions('center.manage')
  @HttpCode(HttpStatus.OK)
  toggleVisibility(@Param('id') id: string) {
    return this.paymentCardService.toggleVisibility(id);
  }

  /**
   * Soft delete (hide) a payment card
   */
  @Delete(':id/soft')
  @RequirePermissions('center.manage')
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id') id: string) {
    return this.paymentCardService.softDelete(id);
  }

  /**
   * Hard delete a payment card
   */
  @Delete(':id')
  @RequirePermissions('center.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.paymentCardService.remove(id);
  }

  /**
   * Reorder cards
   */
  @Post('reorder')
  @RequirePermissions('center.manage')
  @HttpCode(HttpStatus.OK)
  reorder(@Body() body: { centerId: string; cardIds: string[] }) {
    return this.paymentCardService.reorder(body.centerId, body.cardIds);
  }
}

