import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsUrl,
  IsIn,
} from "class-validator";

/**
 * 创建客户 DTO - 添加自定义 Swagger 描述
 *
 * 从 @qzt/shared-types 继承验证规则
 */
export class CreateCustomerDto {
  @ApiProperty({ description: "公司名称", example: "XX科技有限公司" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: "公司简称", example: "QZT" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shortName?: string;

  @ApiPropertyOptional({ description: "公司编码", example: "QZT001" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ description: "所属行业", example: "软件开发" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  industry?: string;

  @ApiPropertyOptional({ description: "公司规模", example: "11-50人" })
  @IsOptional()
  @IsString()
  @IsIn(["1-10人", "11-50人", "51-200人", "201-500人", "500人以上"])
  scale?: string;

  @ApiPropertyOptional({ description: "公司地址" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    description: "公司网站",
    example: "https://example.com",
  })
  @IsOptional()
  @IsUrl({}, { message: "请输入有效的网址" })
  website?: string;

  @ApiPropertyOptional({
    description: "客户等级",
    example: "LEAD",
    enum: ["LEAD", "PROSPECT", "CUSTOMER", "VIP"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["LEAD", "PROSPECT", "CUSTOMER", "VIP"])
  customerLevel?: string;

  @ApiPropertyOptional({ description: "来源渠道" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourceChannel?: string;

  @ApiPropertyOptional({ description: "跟进人ID", example: "user_123" })
  @IsOptional()
  @IsString()
  followUserId?: string;

  @ApiPropertyOptional({ description: "标签（JSON数组）" })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remark?: string;
}
