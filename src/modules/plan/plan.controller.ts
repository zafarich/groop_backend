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
import { PlanService } from './plan.service';
import { CreatePlanDto, UpdatePlanDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('plans')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  @RequirePermissions('plan.create')
  create(@Body() createPlanDto: CreatePlanDto) {
    return this.planService.create(createPlanDto);
  }

  @Get()
  @Public()
  findAll(@Query('isActive') isActive?: string) {
    const isActiveBoolean =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.planService.findAll(isActiveBoolean);
  }

  @Get('seed')
  @RequirePermissions('plan.create')
  seedDefaultPlans() {
    return this.planService.seedDefaultPlans();
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.planService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('plan.update')
  update(@Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto) {
    return this.planService.update(id, updatePlanDto);
  }

  @Delete(':id')
  @RequirePermissions('plan.delete')
  remove(@Param('id') id: string) {
    return this.planService.remove(id);
  }
}

