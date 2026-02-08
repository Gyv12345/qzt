import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

export class UpdateCustomerRuleDto {
  @ApiPropertyOptional({ description: "规则标题" })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: "规则描述" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: "天数数值", example: 7 })
  @IsInt()
  @IsOptional()
  daysValue?: number;

  @ApiPropertyOptional({ description: "是否启用", example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
