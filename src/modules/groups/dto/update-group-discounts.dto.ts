import { IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { GroupDiscountDto } from './create-group.dto';

/**
 * DTO for updating group discounts
 * Replaces all existing discounts with the new list
 * Can be empty array to remove all discounts
 */
export class UpdateGroupDiscountsDto {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => GroupDiscountDto)
  discounts: GroupDiscountDto[];
}
