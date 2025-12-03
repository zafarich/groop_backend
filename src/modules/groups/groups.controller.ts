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
import { CreateGroupDto, UpdateGroupDto } from './dto';
import { ActiveCenterId } from '../../common/decorators/active-center.decorator';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  /**
   * Create a new group
   */
  @Post()
  async create(
    @Body() createGroupDto: CreateGroupDto,
    @ActiveCenterId() activeCenterId: number,
  ) {
    const group = await this.groupsService.create(
      createGroupDto,
      activeCenterId,
    );
    return {
      success: true,
      code: 0,
      data: group,
      message: 'Group created successfully',
      setupInstructions: {
        message: 'Group created. To activate it, complete the following steps:',
        steps: [
          'Create a separate Telegram group for this course',
          'Add your bot to the Telegram group and grant it admin permissions',
          `Send the command /connect ${group.connectToken} to the Telegram group`,
          'Only after these steps are completed, the group becomes fully active.',
        ],
        connectToken: group.connectToken,
        tokenExpires: group.connectTokenExpires,
      },
    };
  }

  /**
   * Get all groups
   */
  @Get()
  async findAll(
    @Query('centerId', ParseIntPipe) centerId?: number,
    @Query('status') status?: string,
  ) {
    const groups = await this.groupsService.findAll(centerId, { status });
    return {
      success: true,
      code: 0,
      data: groups,
      message: 'Groups retrieved successfully',
    };
  }

  /**
   * Get single group
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const group = await this.groupsService.findOne(id);
    return {
      success: true,
      code: 0,
      data: group,
      message: 'Group retrieved successfully',
    };
  }

  /**
   * Update group
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    const group = await this.groupsService.update(id, updateGroupDto);
    return {
      success: true,
      code: 0,
      data: group,
      message: 'Group updated successfully',
    };
  }

  /**
   * Delete group (soft delete)
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.groupsService.remove(id);
    return {
      success: true,
      code: 0,
      data: null,
      message: 'Group deleted successfully',
    };
  }

  /**
   * Regenerate connect token for a group
   */
  @Post(':id/regenerate-token')
  async regenerateToken(@Param('id', ParseIntPipe) id: number) {
    const group = await this.groupsService.regenerateConnectToken(id);
    return {
      success: true,
      code: 0,
      data: {
        connectToken: group.connectToken,
        connectTokenExpires: group.connectTokenExpires,
      },
      message: 'Connection token regenerated successfully',
    };
  }

  /**
   * Get group connection status
   */
  @Get(':id/connection-status')
  async getConnectionStatus(@Param('id', ParseIntPipe) id: number) {
    const status = await this.groupsService.getConnectionStatus(id);
    return {
      success: true,
      code: 0,
      data: status,
      message: 'Connection status retrieved successfully',
    };
  }
}
