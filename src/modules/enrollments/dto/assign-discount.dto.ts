import {
  IsNumber,
  Min,
  IsBoolean,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class AssignDiscountDto {
  @IsNumber()
  @Min(0)
  discountAmount: number;

  @IsBoolean()
  isRecurring: boolean;

  @IsOptional()
  @IsDateString()
  validUntil?: string; // Required if isRecurring = false
}
