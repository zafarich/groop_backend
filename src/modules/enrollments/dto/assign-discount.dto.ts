import {
  IsNumber,
  Min,
  IsOptional,
  IsDateString,
  IsString,
} from 'class-validator';

export class AssignDiscountDto {
  @IsNumber()
  @Min(0)
  customMonthlyPrice: number; // Actual price student pays (0 = free)

  @IsOptional()
  @IsDateString()
  discountStartDate?: string; // When custom price becomes active

  @IsOptional()
  @IsDateString()
  discountEndDate?: string; // When custom price expires (after this, group price applies)

  @IsOptional()
  @IsString()
  discountReason?: string; // Reason for discount (optional, for admin notes)
}
