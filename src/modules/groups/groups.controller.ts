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
