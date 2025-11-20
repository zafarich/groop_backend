import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class UpdateCenterDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsNumber()
  @IsOptional()
  ownerUserId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

