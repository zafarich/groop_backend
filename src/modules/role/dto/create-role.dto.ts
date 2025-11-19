import { IsNotEmpty, IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsNotEmpty()
  centerId: string;

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}

