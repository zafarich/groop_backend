import { IsString, IsOptional } from 'class-validator';

export class EndFreezeDto {
  @IsOptional()
  @IsString()
  endReason?: string; // Optional reason for ending freeze
}
