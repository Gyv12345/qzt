import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsBoolean, IsInt } from "class-validator";

export class LinkCompanyDto {
  @ApiProperty({ description: "公司ID", example: "clx123456" })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: "是否主要联系人",
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiProperty({ description: "是否决策人", default: false, required: false })
  @IsOptional()
  @IsBoolean()
  isDecision?: boolean;

  @ApiProperty({ description: "在该公司的部门", required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: "在该公司的职位", required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({
    description: "与公司关系（法人/股东/采购负责人/财务等）",
    required: false,
  })
  @IsOptional()
  @IsString()
  relation?: string;

  @ApiProperty({ description: "标签", required: false })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({ description: "备注", required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UnlinkCompanyDto {
  @ApiProperty({ description: "公司ID", example: "clx123456" })
  @IsString()
  customerId: string;
}
