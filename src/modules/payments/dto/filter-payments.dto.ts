import { IsOptional, IsEnum, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentStatusFilter {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export class FilterPaymentsDto {
  @IsOptional()
  @IsEnum(PaymentStatusFilter)
  status?: PaymentStatusFilter;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @IsOptional()
  @IsString()
  search?: string; // Search by student name or phone

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
