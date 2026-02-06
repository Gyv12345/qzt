import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, IsEnum } from "class-validator";

export class BatchUpdateCustomersDto {
  @ApiProperty({ description: "客户ID列表", example: ["id1", "id2"] })
  @IsArray()
  customerIds: string[];

  @ApiProperty({
    description: "客户等级",
    enum: ["LEAD", "PROSPECT", "CUSTOMER", "VIP"],
    required: false,
  })
  @IsOptional()
  @IsEnum(["LEAD", "PROSPECT", "CUSTOMER", "VIP"])
  customerLevel?: "LEAD" | "PROSPECT" | "CUSTOMER" | "VIP";

  @ApiProperty({ description: "跟进人ID", required: false })
  @IsOptional()
  @IsString()
  followUserId?: string;

  @ApiProperty({ description: "来源渠道", required: false })
  @IsOptional()
  @IsString()
  sourceChannel?: string;

  @ApiProperty({ description: "行业", required: false })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({
    description: "状态",
    enum: ["ACTIVE", "INACTIVE"],
    required: false,
  })
  @IsOptional()
  @IsEnum(["ACTIVE", "INACTIVE"])
  status?: "ACTIVE" | "INACTIVE";
}

export class BatchDeleteCustomersDto {
  @ApiProperty({ description: "客户ID列表", example: ["id1", "id2"] })
  @IsArray()
  customerIds: string[];
}

export class BatchTagsCustomersDto {
  @ApiProperty({ description: "客户ID列表", example: ["id1", "id2"] })
  @IsArray()
  customerIds: string[];

  @ApiProperty({
    description: "标签（JSON数组字符串）",
    example: '["重要客户","A类"]',
  })
  @IsString()
  tags: string;

  @ApiProperty({
    description: "操作类型",
    enum: ["add", "replace", "remove"],
    example: "add",
  })
  @IsEnum(["add", "replace", "remove"])
  operation: "add" | "replace" | "remove";
}
