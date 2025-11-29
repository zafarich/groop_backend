import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterCenterDto {
  @IsString()
  @IsNotEmpty()
  centerName: string;

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
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;
}
