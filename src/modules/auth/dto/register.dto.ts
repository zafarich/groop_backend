import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsInt,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^998[0-9]{9}$/, {
    message: 'Phone number must be in format 998XXXXXXXXX',
  })
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  centerId: number;
}
