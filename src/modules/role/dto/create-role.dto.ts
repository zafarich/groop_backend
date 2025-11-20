import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

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

  @IsNumber()
  @IsNotEmpty()
  centerId: number;

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}

