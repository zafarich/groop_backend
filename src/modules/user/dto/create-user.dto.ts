import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEnum,
  IsIn,
} from 'class-validator';

export enum UserType {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

export class CreateUserDto {
  @IsEmail()
  @IsOptional()  // Optional for Telegram-only users
  email?: string;

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
  @IsOptional()
  phoneNumber?: string;

  @IsEnum(UserType)
  @IsOptional()
  userType?: UserType;

  @IsString()
  @IsOptional()
  @IsIn(['local', 'telegram', 'google'])
  authProvider?: string;

  @IsUUID()
  @IsNotEmpty()
  centerId: string;

  @IsUUID()
  @IsOptional()
  telegramUserId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
