import { IsNotEmpty, IsString } from 'class-validator';

export class ReactCommentDto {
  @IsString()
  @IsNotEmpty()
  emoji: string;
}
