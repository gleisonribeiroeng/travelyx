import { IsIn } from 'class-validator';

export class ChangeRoleDto {
  @IsIn(['EDITOR', 'VIEWER'])
  role: 'EDITOR' | 'VIEWER';
}
