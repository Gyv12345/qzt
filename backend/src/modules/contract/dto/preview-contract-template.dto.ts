import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional } from "class-validator";

export class PreviewContractTemplateDto {
  @ApiProperty({
    description: "变量值映射",
    example: { customerName: "示例公司", contractNo: "CT2024001" },
  })
  @IsObject()
  @IsOptional()
  variables: Record<string, any>;
}
