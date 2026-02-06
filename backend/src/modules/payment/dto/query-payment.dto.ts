import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsIn } from "class-validator";
import { Type } from "class-transformer";

// 类型定义参考 @qzt/shared-types/dist/payment/schemas

/**
 * 查询收款记录 DTO
 *
 * 类型对应 shared-types 中的 Omit<QueryPaymentParams, 'keyword'>
 */
export class QueryPaymentDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", default: 10 })
  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: "合同ID" })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiPropertyOptional({
    description: "收款方式",
    enum: ["BANK_TRANSFER", "WECHAT", "ALIPAY", "CASH"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["BANK_TRANSFER", "WECHAT", "ALIPAY", "CASH"], {
    message: "收款方式必须是 BANK_TRANSFER、WECHAT、ALIPAY 或 CASH",
  })
  method?: "BANK_TRANSFER" | "WECHAT" | "ALIPAY" | "CASH";

  @ApiPropertyOptional({
    description: "收款状态",
    enum: ["PENDING", "CONFIRMED", "CANCELLED"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["PENDING", "CONFIRMED", "CANCELLED"], {
    message: "收款状态必须是 PENDING、CONFIRMED 或 CANCELLED",
  })
  status?: "PENDING" | "CONFIRMED" | "CANCELLED";
}
