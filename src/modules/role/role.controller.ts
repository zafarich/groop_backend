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
import { RoleService } from './role.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CenterOwnershipGuard } from '../../common/guards/center-ownership.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CheckCenterOwnership } from '../../common/decorators/check-center-ownership.decorator';
import { ActiveCenterId } from '../../common/decorators/active-center.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard, CenterOwnershipGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @RequirePermissions('role.create')
  create(
    @Body() createRoleDto: CreateRoleDto,
    @ActiveCenterId() activeCenterId: number,
  ) {
    return this.roleService.create(createRoleDto, activeCenterId);
  }

  @Get()
  @RequirePermissions('role.read')
  findAll(@ActiveCenterId() activeCenterId: number) {
    return this.roleService.findAll(activeCenterId);
  }

  @Get(':id')
  @RequirePermissions('role.read')
  @CheckCenterOwnership({ resourceName: 'role' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('role.update')
  @CheckCenterOwnership({ resourceName: 'role' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @RequirePermissions('role.delete')
  @CheckCenterOwnership({ resourceName: 'role' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.remove(id);
  }

  @Post(':id/permissions')
  @RequirePermissions('role.assign-permission')
  @CheckCenterOwnership({ resourceName: 'role' })
  assignPermission(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignPermissionDto: AssignPermissionDto,
  ) {
    return this.roleService.assignPermission(id, assignPermissionDto);
  }

  @Delete(':id/permissions/:permissionId')
  @RequirePermissions('role.remove-permission')
  @CheckCenterOwnership({ resourceName: 'role' })
  removePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permissionId') permissionId: number,
  ) {
    return this.roleService.removePermission(id, permissionId);
  }
}
