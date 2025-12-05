import {
  Controller,
  Body,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, FilterGroupsDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CenterOwnershipGuard } from '../../common/guards/center-ownership.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CheckCenterOwnership } from '../../common/decorators/check-center-ownership.decorator';
import { ActiveCenterId } from '../../common/decorators/active-center.decorator';

@Controller('groups')
@UseGuards(JwtAuthGuard, PermissionsGuard, CenterOwnershipGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @RequirePermissions('group.create')
  create(
    @Body() createGroupDto: CreateGroupDto,
    @ActiveCenterId() activeCenterId: number,
  ) {
    return this.groupsService.create(createGroupDto, activeCenterId);
  }

  @Get()
  @RequirePermissions('group.read')
  findAll(
    @ActiveCenterId() activeCenterId: number,
    @Query() filterDto: FilterGroupsDto,
  ) {
    return this.groupsService.findAll(activeCenterId, filterDto);
  }

  @Get(':id')
  @RequirePermissions('group.read')
  @CheckCenterOwnership({ resourceName: 'group' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('group.update')
  @CheckCenterOwnership({ resourceName: 'group' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, updateGroupDto);
  }

  @Delete(':id')
  @RequirePermissions('group.delete')
  @CheckCenterOwnership({ resourceName: 'group' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.remove(id);
  }

  @Post(':id/regenerate-token')
  @RequirePermissions('group.update')
  @CheckCenterOwnership({ resourceName: 'group' })
  regenerateToken(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.regenerateConnectToken(id);
  }

  @Get(':id/connection-status')
  @RequirePermissions('group.read')
  @CheckCenterOwnership({ resourceName: 'group' })
  getConnectionStatus(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.getConnectionStatus(id);
  }
}
