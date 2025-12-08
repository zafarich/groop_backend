import { IsString, IsInt } from 'class-validator';

export class CreateRefundDto {
  @IsInt()
  enrollmentId: number;

  @IsString()
  requestReason: string;
}
