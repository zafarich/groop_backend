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
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, AssignRoleDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CenterOwnershipGuard } from '../../common/guards/center-ownership.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CheckCenterOwnership } from '../../common/decorators/check-center-ownership.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActiveCenterId } from '../../common/decorators/active-center.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard, CenterOwnershipGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @RequirePermissions('user.create')
  create(
    @Body() createUserDto: CreateUserDto,
    @ActiveCenterId() activeCenterId: number,
  ) {
    return this.userService.create(createUserDto, activeCenterId);
  }

  @Get()
  @RequirePermissions('user.read')
  findAll(@ActiveCenterId() activeCenterId: number) {
    return this.userService.findAll(activeCenterId);
  }

  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return user;
  }

  @Get(':id')
  @RequirePermissions('user.read')
  @CheckCenterOwnership({ resourceName: 'user' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('user.update')
  @CheckCenterOwnership({ resourceName: 'user' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @RequirePermissions('user.delete')
  @CheckCenterOwnership({ resourceName: 'user' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }

  @Post(':id/roles')
  @RequirePermissions('user.assign-role')
  @CheckCenterOwnership({ resourceName: 'user' })
  assignRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignRoleDto: AssignRoleDto,
  ) {
    return this.userService.assignRole(id, assignRoleDto);
  }

  @Delete(':id/roles/:roleId')
  @RequirePermissions('user.remove-role')
  @CheckCenterOwnership({ resourceName: 'user' })
  removeRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    return this.userService.removeRole(id, roleId);
  }
}
