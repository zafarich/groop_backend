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
  ParseIntPipe
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
  findAll(@Query('centerId', new ParseIntPipe({ optional: true })) centerId?: number) {
    return this.roleService.findAll(centerId);
  }

  @Get(':id')
  @RequirePermissions('role.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('role.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @RequirePermissions('role.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.remove(id);
  }

  @Post(':id/permissions')
  @RequirePermissions('role.assign-permission')
  assignPermission(@Param('id', ParseIntPipe) id: number, @Body() assignPermissionDto: AssignPermissionDto) {
    return this.roleService.assignPermission(id, assignPermissionDto);
  }

  @Delete(':id/permissions/:permissionId')
  @RequirePermissions('role.remove-permission')
  removePermission(@Param('id', ParseIntPipe) id: number, @Param('permissionId') permissionId: number) {
    return this.roleService.removePermission(id, permissionId);
  }
}

