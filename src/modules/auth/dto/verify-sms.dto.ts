import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifySmsDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^998[0-9]{9}$/, {
    message: 'Phone number must be in format 998XXXXXXXXX',
  })
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
