import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';

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

  @IsUUID()
  @IsOptional()
  ownerUserId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

