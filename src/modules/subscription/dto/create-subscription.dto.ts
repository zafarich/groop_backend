import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
}

export class CreateSubscriptionDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  centerId: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  planId: number;

  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @IsDateString()
  @IsNotEmpty()
  currentPeriodStart: string;

  @IsDateString()
  @IsNotEmpty()
  currentPeriodEnd: string;

  @IsBoolean()
  @IsOptional()
  cancelAtPeriodEnd?: boolean;

  @IsString()
  @IsOptional()
  externalCustomerId?: string;

  @IsString()
  @IsOptional()
  externalSubscriptionId?: string;
}
