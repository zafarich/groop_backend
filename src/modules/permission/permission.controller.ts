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
} from '@nestjs/common';
import { PermissionService } from './permission.service';
import { CreatePermissionDto, UpdatePermissionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @RequirePermissions('permission.create')
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionService.create(createPermissionDto);
  }

  @Get()
  @RequirePermissions('permission.read')
  findAll(@Query('module') module?: string) {
    return this.permissionService.findAll(module);
  }

  @Get('seed')
  @RequirePermissions('permission.create')
  seedDefaultPermissions() {
    return this.permissionService.seedDefaultPermissions();
  }

  @Get(':id')
  @RequirePermissions('permission.read')
  findOne(@Param('id') id: string) {
    return this.permissionService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('permission.update')
  update(@Param('id') id: string, @Body() updatePermissionDto: UpdatePermissionDto) {
    return this.permissionService.update(id, updatePermissionDto);
  }

  @Delete(':id')
  @RequirePermissions('permission.delete')
  remove(@Param('id') id: string) {
    return this.permissionService.remove(id);
  }
}

