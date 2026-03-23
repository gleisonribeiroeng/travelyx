import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExpenseEntryDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  amount: number;
}

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsNumber()
  totalAmount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  splitMode?: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExpenseEntryDto)
  entries: ExpenseEntryDto[];
}
