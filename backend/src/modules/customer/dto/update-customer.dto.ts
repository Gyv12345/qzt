import { ApiPropertyOptional } from '@nestjs/swagger'
import { PartialType } from '@nestjs/swagger'
import { CreateCustomerDto } from './create-customer.dto'

/**
 * 更新客户 DTO - 所有字段可选
 */
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
