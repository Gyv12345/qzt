import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsArray, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class SignerInfo {
  @ApiProperty({ description: "签署人姓名" })
  @IsString()
  name: string;

  @ApiProperty({ description: "签署人手机号" })
  @IsString()
  mobile: string;

  @ApiProperty({
    description: "签署人类型: ENTERPRISE, PERSON",
    example: "PERSON",
  })
  @IsString()
  signerType: "ENTERPRISE" | "PERSON";

  @ApiProperty({ description: "企业名称(企业签署时必填)", required: false })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiProperty({ description: "证件号(个人签署时必填)", required: false })
  @IsOptional()
  @IsString()
  idCard?: string;
}

export class InitiateSigningDto {
  @ApiProperty({ description: "合同ID", example: "clx1234567890" })
  @IsString()
  contractId: string;

  @ApiProperty({ description: "签署人列表", type: [SignerInfo] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignerInfo)
  signers: SignerInfo[];

  @ApiProperty({ description: "合同标题", example: "XX服务合同" })
  @IsString()
  subject: string;

  @ApiProperty({ description: "合同描述", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "备注", required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
