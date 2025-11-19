import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  monthlyPrice: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsInt()
  @IsOptional()
  maxStudents?: number;

  @IsInt()
  @IsOptional()
  maxTeachers?: number;

  @IsInt()
  @IsOptional()
  maxGroups?: number;

  @IsInt()
  @IsOptional()
  maxCenters?: number;

  @IsString()
  @IsOptional()
  featuresJson?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
