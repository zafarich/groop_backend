import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsIn,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum UserType {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

export class CreateUserDto {
  @IsString()
  @IsOptional()  // Optional for Telegram-only users
  @MinLength(6)
  password?: string;

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
  @IsNotEmpty()
  @Matches(/^998[0-9]{9}$/, {
    message: 'Phone number must be in format 998XXXXXXXXX',
  })
  phoneNumber: string;

  @IsEnum(UserType)
  @IsOptional()
  userType?: UserType;

  @IsString()
  @IsOptional()
  @IsIn(['local', 'telegram', 'google'])
  authProvider?: string;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  centerId: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  telegramUserId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
