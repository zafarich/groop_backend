import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsDateString,
} from 'class-validator';

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
}

export class CreateSubscriptionDto {
  @IsUUID()
  @IsNotEmpty()
  centerId: string;

  @IsUUID()
  @IsNotEmpty()
  planId: string;

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
