import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateCenterBotDto {
  @IsUUID()
  @IsNotEmpty()
  centerId: string;

  @IsString()
  @IsNotEmpty()
  botToken: string;

  @IsString()
  @IsOptional()
  botUsername?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

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

