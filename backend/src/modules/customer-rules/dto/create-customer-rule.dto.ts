import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, IsBoolean, IsOptional } from "class-validator";

export class CreateCustomerRuleDto {
  @ApiProperty({ description: "规则唯一标识", example: "follow_up_days" })
  @IsString()
  code: string;

  @ApiProperty({ description: "规则标题", example: "跟进天数" })
  @IsString()
  title: string;

  @ApiProperty({ description: "规则描述", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "天数数值", example: 7 })
  @IsInt()
  daysValue: number;

  @ApiProperty({ description: "是否启用", example: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
