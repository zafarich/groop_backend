import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsNumber,
} from 'class-validator';

export class CreateTelegramUserDto {
  @IsString()
  @IsNotEmpty()
  telegramId: string;

  @IsNumber()
  @IsOptional()
  centerId?: number;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsBoolean()
  @IsOptional()
  isBot?: boolean;

  @IsString()
  @IsOptional()
  languageCode?: string;

  @IsString()
  @IsOptional()
  chatId?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  metadata?: any;

  // Flag to auto-create linked User
  @IsBoolean()
  @IsOptional()
  createLinkedUser?: boolean;
}

