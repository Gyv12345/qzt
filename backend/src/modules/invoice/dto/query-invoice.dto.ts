import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsIn } from 'class-validator'
import { Type } from 'class-transformer'

// 类型定义参考 @qzt/shared-types/dist/invoice/schemas

/**
 * 查询发票 DTO
 *
 * 类型对应 shared-types 中的 Omit<QueryInvoiceParams, 'keyword'>
 */
export class QueryInvoiceDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 10

  @ApiPropertyOptional({ description: '客户ID' })
  @IsOptional()
  @IsString()
  customerId?: string

  @ApiPropertyOptional({ description: '合同ID' })
  @IsOptional()
  @IsString()
  contractId?: string

  @ApiPropertyOptional({
    description: '发票状态',
    enum: ['PENDING', 'ISSUED', 'CANCELLED'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'ISSUED', 'CANCELLED'], {
    message: '发票状态必须是 PENDING、ISSUED 或 CANCELLED',
  })
  status?: 'PENDING' | 'ISSUED' | 'CANCELLED'

  @ApiPropertyOptional({ description: '开票月份(YYYY-MM)' })
  @IsOptional()
  @IsString()
  month?: string
}
