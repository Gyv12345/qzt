import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, IsIn } from 'class-validator'

/**
 * 查询客户 DTO - 分页和筛选参数
 */
export class QueryCustomerDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number

  @ApiPropertyOptional({ description: '每页数量', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  keyword?: string

  @ApiPropertyOptional({
    description: '客户等级',
    enum: ['LEAD', 'PROSPECT', 'CUSTOMER', 'VIP'],
  })
  @IsOptional()
  @IsIn(['LEAD', 'PROSPECT', 'CUSTOMER', 'VIP'])
  customerLevel?: string

  @ApiPropertyOptional({ description: '客户状态', enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string

  @ApiPropertyOptional({ description: '跟进人ID' })
  @IsOptional()
  @IsString()
  followUserId?: string

  @ApiPropertyOptional({ description: '排序字段', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortField?: string

  @ApiPropertyOptional({ description: '排序方向', example: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc'
}
