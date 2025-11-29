import { IsInt, IsNotEmpty } from 'class-validator';

export class SetActiveCenterDto {
  @IsInt()
  @IsNotEmpty()
  centerId: number;
}
