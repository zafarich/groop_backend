import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import {
  ActivateEnrollmentDto,
  AssignDiscountDto,
  FilterEnrollmentsDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CenterOwnershipGuard } from '../../common/guards/center-ownership.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CheckCenterOwnership } from '../../common/decorators/check-center-ownership.decorator';
import { ActiveCenterId } from '../../common/decorators/active-center.decorator';
import { TelegramService } from '../telegram/telegram.service';

@Controller('enrollments')
@UseGuards(JwtAuthGuard, PermissionsGuard, CenterOwnershipGuard)
export class EnrollmentsController {
  constructor(
    private readonly enrollmentsService: EnrollmentsService,
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
  ) {}

  @Get('leads')
  @RequirePermissions('enrollment.read')
  findLeads(
    @Query('groupId', ParseIntPipe) groupId: number,
    @ActiveCenterId() centerId: number,
  ) {
    return this.enrollmentsService.findLeads(groupId, centerId);
  }

  @Get(':id')
  @RequirePermissions('enrollment.read')
  @CheckCenterOwnership({ resourceName: 'enrollment' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.enrollmentsService.findOne(id);
  }

  @Get(':id/activation-preview')
  @RequirePermissions('enrollment.read')
  @CheckCenterOwnership({ resourceName: 'enrollment' })
  getActivationPreview(
    @Param('id', ParseIntPipe) id: number,
    @Query('lessonStartDate') lessonStartDate: string,
  ) {
    return this.enrollmentsService.getActivationPreview(
      id,
      new Date(lessonStartDate),
    );
  }

  @Patch(':id/activate')
  @RequirePermissions('enrollment.update')
  @CheckCenterOwnership({ resourceName: 'enrollment' })
  activateEnrollment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActivateEnrollmentDto,
    @ActiveCenterId() centerId: number,
  ) {
    return this.enrollmentsService.activateEnrollment(id, dto, centerId);
  }

  @Patch(':id/discount')
  @RequirePermissions('enrollment.update')
  @CheckCenterOwnership({ resourceName: 'enrollment' })
  async assignDiscount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignDiscountDto,
  ) {
    const result = await this.enrollmentsService.assignDiscount(id, dto);

    // Send notification to student via Telegram
    if (result.shouldNotifyStudent && result.data) {
      await this.telegramService.notifyStudentAboutDiscount(
        result.data,
        result.isFreeEnrollment,
      );
    }

    return result;
  }
}

@Controller('groups')
@UseGuards(JwtAuthGuard, PermissionsGuard, CenterOwnershipGuard)
export class GroupEnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get(':id/students')
  @RequirePermissions('enrollment.read')
  @CheckCenterOwnership({ resourceName: 'group' })
  findStudentsByGroup(
    @Param('id', ParseIntPipe) groupId: number,
    @ActiveCenterId() centerId: number,
    @Query() filterDto: FilterEnrollmentsDto,
  ) {
    return this.enrollmentsService.findStudentsByGroup(
      groupId,
      centerId,
      filterDto,
    );
  }
}
