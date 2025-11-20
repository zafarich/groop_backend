import { IsNotEmpty, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignRoleDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  roleId: number;
}
