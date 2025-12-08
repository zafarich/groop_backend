import { IsString, IsDateString, IsOptional, IsInt } from 'class-validator';

export class CreateFreezeDto {
  @IsInt()
  enrollmentId: number;

  @IsString()
  reason: string;

  @IsDateString()
  freezeStartDate: string;

  @IsOptional()
  @IsDateString()
  freezeEndDate?: string; // null = indefinite freeze
}
