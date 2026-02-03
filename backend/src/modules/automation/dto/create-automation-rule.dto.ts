import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateAutomationRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsString()
  @IsOptional()
  config?: string;

  @IsString()
  @IsOptional()
  cronExpression?: string;
}
