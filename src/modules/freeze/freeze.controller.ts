import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { FreezeService } from './freeze.service';
import { CreateFreezeDto, EndFreezeDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CenterOwnershipGuard } from '../../common/guards/center-ownership.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ActiveCenterId } from '../../common/decorators/active-center.decorator';

@Controller('freeze')
@UseGuards(JwtAuthGuard, PermissionsGuard, CenterOwnershipGuard)
export class FreezeController {
  constructor(private readonly freezeService: FreezeService) {}

  @Post()
  @RequirePermissions('enrollment.update')
  create(
    @Body() createFreezeDto: CreateFreezeDto,
    @ActiveCenterId() centerId: number,
  ) {
    return this.freezeService.createFreeze(createFreezeDto, centerId);
  }

  @Patch(':id/end')
  @RequirePermissions('enrollment.update')
  end(
    @Param('id', ParseIntPipe) id: number,
    @Body() endFreezeDto: EndFreezeDto,
    @ActiveCenterId() centerId: number,
  ) {
    return this.freezeService.endFreeze(id, endFreezeDto, centerId);
  }

  @Delete(':id')
  @RequirePermissions('enrollment.update')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @ActiveCenterId() centerId: number,
  ) {
    return this.freezeService.cancelFreeze(id, centerId);
  }

  @Get('enrollment/:enrollmentId')
  @RequirePermissions('enrollment.read')
  getByEnrollment(
    @Param('enrollmentId', ParseIntPipe) enrollmentId: number,
    @ActiveCenterId() centerId: number,
  ) {
    return this.freezeService.getFreezesByEnrollment(enrollmentId, centerId);
  }
}
