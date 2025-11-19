import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateTelegramUserDto {
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

  @IsString()
  @IsOptional()
  languageCode?: string;

  @IsString()
  @IsOptional()
  chatId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  metadata?: any;
}

