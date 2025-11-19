import { IsString, IsOptional } from 'class-validator';

export class UpdatePermissionDto {
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
  module?: string;

  @IsString()
  @IsOptional()
  action?: string;
}

