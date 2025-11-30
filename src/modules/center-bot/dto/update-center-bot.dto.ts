import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';

export class UpdateCenterBotDto {
  @IsString()
  @IsOptional()
  botToken?: string;

  @IsString()
  @IsOptional()
  botUsername?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/, {
    message: 'Invalid card number format',
  })
  paymentCardNumber?: string;

  @IsString()
  @IsOptional()
  paymentCardHolder?: string;

  @IsString()
  @IsOptional()
  paymentBankName?: string;

  @IsString()
  @IsOptional()
  welcomeMessage?: string;

  @IsString()
  @IsOptional()
  courseInfoTemplate?: string;

  @IsString()
  @IsOptional()
  paymentInstruction?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
