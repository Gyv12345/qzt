import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class CreateEsignRecordDto {
  @ApiProperty({ description: "合同ID", example: "clx1234567890" })
  @IsString()
  contractId: string;

  @ApiProperty({ description: "备注", required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
