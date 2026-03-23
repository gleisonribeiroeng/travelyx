import { IsEmail, IsIn, IsNotEmpty } from 'class-validator';

export class InviteDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsIn(['EDITOR', 'VIEWER'])
  role: 'EDITOR' | 'VIEWER';
}
