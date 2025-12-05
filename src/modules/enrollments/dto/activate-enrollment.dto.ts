import { IsDateString } from 'class-validator';

export class ActivateEnrollmentDto {
  @IsDateString()
  lessonStartDate: string;
}
