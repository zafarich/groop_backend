import { IsNotEmpty, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignPermissionDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  permissionId: number;
}
