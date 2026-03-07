import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, MaxLength } from "class-validator";

export class CreateContractTemplateDto {
  @ApiProperty({ description: "模板名称", example: "销售合同模板" })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: "模板编码", example: "SALES_CONTRACT" })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: "合同内容" })
  @IsString()
  content: string;

  @ApiProperty({ description: "变量定义(JSON)", required: false })
  @IsOptional()
  @IsString()
  variables?: string;

  @ApiProperty({ description: "模板描述", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
