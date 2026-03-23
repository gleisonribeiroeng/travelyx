import { IsNotEmpty, IsString, IsArray, ArrayMinSize } from 'class-validator';

export class CreatePollDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];
}
