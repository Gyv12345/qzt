import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, MaxLength, IsNumber } from "class-validator";

export class UpdateContractTemplateDto {
  @ApiProperty({ description: "模板名称", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: "模板编码", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({ description: "合同内容", required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: "变量定义(JSON)", required: false })
  @IsOptional()
  @IsString()
  variables?: string;

  @ApiProperty({ description: "模板描述", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: "模板状态", required: false })
  @IsOptional()
  @IsNumber()
  status?: number;
}
