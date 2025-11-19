import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class CreateCenterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsUUID()
  @IsOptional()
  ownerUserId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
