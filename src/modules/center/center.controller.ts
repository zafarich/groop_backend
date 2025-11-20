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
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('centers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.centerService.findOne(id);
  }

  @Get(':id/stats')
  @RequirePermissions('center.read')
  getCenterStats(@Param('id', ParseIntPipe) id: number) {
    return this.centerService.getCenterStats(id);
  }

  @Patch(':id')
  @RequirePermissions('center.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCenterDto: UpdateCenterDto) {
    return this.centerService.update(id, updateCenterDto);
  }

  @Delete(':id')
  @RequirePermissions('center.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.centerService.remove(id);
  }
}

