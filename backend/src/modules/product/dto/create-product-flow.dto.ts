import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from "class-validator";

export class CreateProductFlowDto {
  @ApiProperty({ description: "产品ID", example: "cuid123" })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: "流程名称", example: "标准记账流程" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "流程类型",
    example: "NODE",
    enum: ["NODE", "CYCLE"],
  })
  @IsString()
  @IsNotEmpty()
  type: "NODE" | "CYCLE";

  @ApiProperty({
    description: "流程配置(JSON)",
    example: '{"nodes":[{"name":"收集凭证","role":"FINANCE","order":1}]}',
  })
  @IsString()
  @IsNotEmpty()
  config: string;

  @ApiProperty({ description: "是否启用", required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
