import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentCardDto } from './create-payment-card.dto';
import { IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class UpdatePaymentCardDto extends PartialType(CreatePaymentCardDto) {
  @IsUUID()
  @IsOptional()
  centerId?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

