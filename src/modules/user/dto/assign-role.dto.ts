import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignRoleDto {
  @IsUUID()
  @IsNotEmpty()
  roleId: string;
}
