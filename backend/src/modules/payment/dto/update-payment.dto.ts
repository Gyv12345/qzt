import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  MaxLength,
  IsIn,
} from "class-validator";

// 类型定义参考 @qzt/shared-types/dist/payment/schemas

/**
 * 更新收款记录 DTO
 *
 * 类型对应 shared-types 中的 Omit<UpdatePaymentBase, 'contractId'>
 * 所有字段都是可选的，且不能修改 contractId
 */
export class UpdatePaymentDto {
  @ApiPropertyOptional({ description: "收款金额", example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: "收款金额必须大于等于0" })
  amount?: number;

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

  @ApiPropertyOptional({ description: "凭证URL" })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "凭证URL最多500个字符" })
  voucherUrl?: string;

  @ApiPropertyOptional({ description: "付款时间" })
  @IsOptional()
  @IsDateString()
  payTime?: string;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "备注最多500个字符" })
  remark?: string;
}
