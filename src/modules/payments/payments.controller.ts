import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { FilterPaymentsDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CenterOwnershipGuard } from '../../common/guards/center-ownership.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveCenterId } from '../../common/decorators/active-center.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard, CenterOwnershipGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Get all payments with filters and pagination
   * Query params: status, groupId, search, page, limit
   */
  @Get()
  @RequirePermissions('enrollment.read')
  findAll(
    @ActiveCenterId() centerId: number,
    @Query() filterDto: FilterPaymentsDto,
  ) {
    return this.paymentsService.findAll(centerId, filterDto);
  }

  /**
   * Get payment statistics (count by status)
   */
  @Get('stats')
  @RequirePermissions('enrollment.read')
  getStats(@ActiveCenterId() centerId: number) {
    return this.paymentsService.getStats(centerId);
  }

  /**
   * Get a single payment by ID
   */
  @Get(':id')
  @RequirePermissions('enrollment.read')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @ActiveCenterId() centerId: number,
  ) {
    return this.paymentsService.findOne(id, centerId);
  }
}
