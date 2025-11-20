import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCenterBotDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  centerId: number;

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

