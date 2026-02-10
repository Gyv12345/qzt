import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsNotEmpty, MinLength } from "class-validator";

export class SubmitContactDto {
  @ApiProperty({ description: "联系人姓名", example: "张三" })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: "联系电话", example: "13800138000" })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: "联系邮箱",
    example: "zhangsan@example.com",
    required: false,
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: "公司名称",
    example: "某某科技有限公司",
    required: false,
  })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiProperty({
    description: "留言内容",
    example: "我想了解企智通的产品功能，希望能安排产品演示。",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  message: string;
}
