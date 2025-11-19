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
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, AssignRoleDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @RequirePermissions('user.create')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @RequirePermissions('user.read')
  findAll(@Query('centerId') centerId?: string) {
    return this.userService.findAll(centerId);
  }

  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return user;
  }

  @Get(':id')
  @RequirePermissions('user.read')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('user.update')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @RequirePermissions('user.delete')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Post(':id/roles')
  @RequirePermissions('user.assign-role')
  assignRole(@Param('id') id: string, @Body() assignRoleDto: AssignRoleDto) {
    return this.userService.assignRole(id, assignRoleDto);
  }

  @Delete(':id/roles/:roleId')
  @RequirePermissions('user.remove-role')
  removeRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.userService.removeRole(id, roleId);
  }
}

