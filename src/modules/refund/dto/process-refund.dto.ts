import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ProcessRefundDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  processingNotes?: string;
}
