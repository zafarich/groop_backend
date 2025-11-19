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
import { RoleService } from './role.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @RequirePermissions('role.create')
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  @Get()
  @RequirePermissions('role.read')
  findAll(@Query('centerId') centerId?: string) {
    return this.roleService.findAll(centerId);
  }

  @Get(':id')
  @RequirePermissions('role.read')
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('role.update')
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @RequirePermissions('role.delete')
  remove(@Param('id') id: string) {
    return this.roleService.remove(id);
  }

  @Post(':id/permissions')
  @RequirePermissions('role.assign-permission')
  assignPermission(@Param('id') id: string, @Body() assignPermissionDto: AssignPermissionDto) {
    return this.roleService.assignPermission(id, assignPermissionDto);
  }

  @Delete(':id/permissions/:permissionId')
  @RequirePermissions('role.remove-permission')
  removePermission(@Param('id') id: string, @Param('permissionId') permissionId: string) {
    return this.roleService.removePermission(id, permissionId);
  }
}

