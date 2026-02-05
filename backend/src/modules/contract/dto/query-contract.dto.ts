import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsIn } from 'class-validator'
import { Type } from 'class-transformer'

// 类型定义参考 @qzt/shared-types/dist/contract/schemas

/**
 * 查询合同 DTO
 *
 * 类型对应 shared-types 中的 QueryContractParams
 */
export class QueryContractDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 10

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({ description: '客户ID' })
  @IsOptional()
  @IsString()
  customerId?: string

  @ApiPropertyOptional({ description: '产品ID' })
  @IsOptional()
  @IsString()
  productId?: string

  @ApiPropertyOptional({
    description: '合同状态',
    enum: ['UNPAID', 'PARTIAL', 'PAID'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['UNPAID', 'PARTIAL', 'PAID'], { message: '合同状态必须是 UNPAID、PARTIAL 或 PAID' })
  status?: 'UNPAID' | 'PARTIAL' | 'PAID'
}
