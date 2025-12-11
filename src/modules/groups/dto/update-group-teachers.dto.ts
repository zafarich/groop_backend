import { IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TeacherAssignmentDto } from './create-group.dto';

/**
 * DTO for updating group teachers
 * Replaces all existing teachers with the new list
 */
export class UpdateGroupTeachersDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one teacher is required' })
  @ValidateNested({ each: true })
  @Type(() => TeacherAssignmentDto)
  teachers: TeacherAssignmentDto[];
}
