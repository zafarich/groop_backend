import { IsOptional, IsString, IsBoolean, Matches } from 'class-validator';

export class UpdateTeacherDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^998[0-9]{9}$/, {
    message: 'Phone number must be in format 998XXXXXXXXX',
  })
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  specialty?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
