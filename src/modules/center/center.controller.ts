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
import { CenterService } from './center.service';
import { CreateCenterDto, UpdateCenterDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CenterOwnershipGuard } from '../../common/guards/center-ownership.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CheckCenterOwnership } from '../../common/decorators/check-center-ownership.decorator';

@Controller('centers')
@UseGuards(JwtAuthGuard, PermissionsGuard, CenterOwnershipGuard)
export class CenterController {
  constructor(private readonly centerService: CenterService) {}

  @Post()
  @RequirePermissions('center.create')
  create(@Body() createCenterDto: CreateCenterDto) {
    return this.centerService.create(createCenterDto);
  }

  @Get()
  @RequirePermissions('center.read')
  findAll() {
    return this.centerService.findAll();
  }

  @Get(':id')
  @RequirePermissions('center.read')
  @CheckCenterOwnership({ resourceName: 'center' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.centerService.findOne(id);
  }

  @Get(':id/stats')
  @RequirePermissions('center.read')
  @CheckCenterOwnership({ resourceName: 'center' })
  getCenterStats(@Param('id', ParseIntPipe) id: number) {
    return this.centerService.getCenterStats(id);
  }

  @Patch(':id')
  @RequirePermissions('center.update')
  @CheckCenterOwnership({ resourceName: 'center' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCenterDto: UpdateCenterDto,
  ) {
    return this.centerService.update(id, updateCenterDto);
  }

  @Delete(':id')
  @RequirePermissions('center.delete')
  @CheckCenterOwnership({ resourceName: 'center' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.centerService.remove(id);
  }
}
