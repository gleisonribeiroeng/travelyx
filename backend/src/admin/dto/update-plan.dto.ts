import { IsIn, IsOptional, IsPositive } from 'class-validator';

export class UpdatePlanDto {
  @IsIn(['FREE', 'PRO', 'BUSINESS'])
  plan: string;

  @IsOptional()
  @IsPositive()
  daysValid?: number;
}
