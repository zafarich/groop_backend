import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { SubscriptionStatus } from './create-subscription.dto';

export class UpdateSubscriptionDto {
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @IsDateString()
  @IsOptional()
  currentPeriodStart?: string;

  @IsDateString()
  @IsOptional()
  currentPeriodEnd?: string;

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

