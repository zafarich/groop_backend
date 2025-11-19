import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  key?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  monthlyPrice?: number;

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

