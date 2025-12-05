import { IsOptional, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterGroupsDto {
  @IsOptional()
  @IsString()
  search?: string; // Search by group name

  @IsOptional()
  @IsString()
  status?: string; // Filter by status: PENDING, ACTIVE, INACTIVE

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}
