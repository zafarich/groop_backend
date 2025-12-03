import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupDto } from './create-group.dto';
import { IsOptional } from 'class-validator';

// UpdateGroupDto makes all fields from CreateGroupDto optional
// Note: Updating nested entities (teachers, schedules, discounts) should be done
// through separate dedicated endpoints for better control and clarity
export class UpdateGroupDto extends PartialType(CreateGroupDto) {
  // All fields from CreateGroupDto are now optional
  // Nested arrays (teachers, lessonSchedules, discounts) are excluded from direct updates
  // Use dedicated endpoints instead:
  // - PUT /groups/:id/teachers
  // - PUT /groups/:id/schedules
  // - PUT /groups/:id/discounts

  @IsOptional()
  teachers?: never; // Prevent updating teachers through this DTO

  @IsOptional()
  lessonSchedules?: never; // Prevent updating schedules through this DTO

  @IsOptional()
  discounts?: never; // Prevent updating discounts through this DTO
}
