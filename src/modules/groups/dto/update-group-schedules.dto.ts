import { IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LessonScheduleDto } from './create-group.dto';

/**
 * DTO for updating group lesson schedules
 * Replaces all existing schedules with the new list
 */
export class UpdateGroupSchedulesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one lesson schedule is required' })
  @ValidateNested({ each: true })
  @Type(() => LessonScheduleDto)
  schedules: LessonScheduleDto[];
}
