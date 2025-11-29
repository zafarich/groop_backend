import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto, UpdateTeacherDto, FilterTeachersDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CenterOwnershipGuard } from '../../common/guards/center-ownership.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CheckCenterOwnership } from '../../common/decorators/check-center-ownership.decorator';
import { ActiveCenterId } from '../../common/decorators/active-center.decorator';

@Controller('teachers')
@UseGuards(JwtAuthGuard, PermissionsGuard, CenterOwnershipGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @RequirePermissions('teacher.create')
  create(
    @Body() createTeacherDto: CreateTeacherDto,
    @ActiveCenterId() activeCenterId: number,
  ) {
    return this.teachersService.create(createTeacherDto, activeCenterId);
  }

  @Get()
  @RequirePermissions('teacher.read')
  findAll(
    @ActiveCenterId() activeCenterId: number,
    @Query() filterDto: FilterTeachersDto,
  ) {
    return this.teachersService.findAll(activeCenterId, filterDto);
  }

  @Get(':id')
  @RequirePermissions('teacher.read')
  @CheckCenterOwnership({ resourceName: 'teacher' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('teacher.update')
  @CheckCenterOwnership({ resourceName: 'teacher' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTeacherDto: UpdateTeacherDto,
  ) {
    return this.teachersService.update(id, updateTeacherDto);
  }

  @Delete(':id')
  @RequirePermissions('teacher.delete')
  @CheckCenterOwnership({ resourceName: 'teacher' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.remove(id);
  }

  @Get(':id/bot-link')
  @RequirePermissions('teacher.read')
  @CheckCenterOwnership({ resourceName: 'teacher' })
  getBotLink(@Param('id', ParseIntPipe) id: number) {
    return this.teachersService.getBotLink(id);
  }
}
