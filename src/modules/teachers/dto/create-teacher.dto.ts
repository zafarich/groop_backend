import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTeacherDto {
  // User information
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^998[0-9]{9}$/, {
    message: 'Phone number must be in format 998XXXXXXXXX',
  })
  phoneNumber: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  telegramUserId?: number; // Will be linked when teacher opens bot

  // Teacher-specific information
  @IsString()
  @IsOptional()
  specialty?: string;

  @IsString()
  @IsOptional()
  bio?: string;
}
