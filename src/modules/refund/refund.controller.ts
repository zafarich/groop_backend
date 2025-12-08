import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RefundService } from './refund.service';
import { CreateRefundDto, ProcessRefundDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CenterOwnershipGuard } from '../../common/guards/center-ownership.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveCenterId } from '../../common/decorators/active-center.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('refunds')
@UseGuards(JwtAuthGuard, PermissionsGuard, CenterOwnershipGuard)
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post()
  @RequirePermissions('enrollment.update')
  create(
    @Body() createRefundDto: CreateRefundDto,
    @ActiveCenterId() centerId: number,
  ) {
    return this.refundService.createRefund(createRefundDto, centerId);
  }

  @Patch(':id/process')
  @RequirePermissions('enrollment.manage')
  process(
    @Param('id', ParseIntPipe) id: number,
    @Body() processRefundDto: ProcessRefundDto,
    @CurrentUser() user: any,
    @ActiveCenterId() centerId: number,
  ) {
    return this.refundService.processRefund(
      id,
      processRefundDto,
      user.id,
      centerId,
    );
  }

  @Get()
  @RequirePermissions('enrollment.read')
  getAll(
    @ActiveCenterId() centerId: number,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED',
  ) {
    return this.refundService.getRefundRequests(centerId, status);
  }

  @Get(':id')
  @RequirePermissions('enrollment.read')
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @ActiveCenterId() centerId: number,
  ) {
    return this.refundService.getRefundById(id, centerId);
  }
}
