import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentOrderDto {
  @ApiProperty({ description: '关联合同ID', required: false })
  @IsString()
  @IsOptional()
  contractId?: string;

  @ApiProperty({ description: '支付金额', example: 100.00 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: '支付方式: wechat, alipay, bank', example: 'wechat' })
  @IsString()
  @IsIn(['wechat', 'alipay', 'bank'])
  paymentMethod: string;

  @ApiPropertyOptional({ description: '支付渠道' })
  @IsString()
  @IsOptional()
  paymentChannel?: string;

  @ApiPropertyOptional({ description: '客户端IP' })
  @IsString()
  @IsOptional()
  clientIp?: string;

  @ApiPropertyOptional({ description: '支付完成跳转URL' })
  @IsString()
  @IsOptional()
  returnUrl?: string;

  @ApiPropertyOptional({ description: '异步通知URL' })
  @IsString()
  @IsOptional()
  notifyUrl?: string;

  @ApiPropertyOptional({ description: '订单描述' })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({ description: '附加数据' })
  @IsString()
  @IsOptional()
  attach?: string;
}

export class UpdatePaymentOrderDto {
  @ApiPropertyOptional({ description: '支付状态', enum: ['pending', 'paid', 'cancelled', 'refunded', 'expired'] })
  @IsString()
  @IsIn(['pending', 'paid', 'cancelled', 'refunded', 'expired'])
  @IsOptional()
  status?: string;
}

export class QueryPaymentOrderDto {
  @ApiPropertyOptional({ description: '关联合同ID' })
  @IsString()
  @IsOptional()
  contractId?: string;

  @ApiPropertyOptional({ description: '订单号' })
  @IsString()
  @IsOptional()
  orderNo?: string;

  @ApiPropertyOptional({ description: '支付方式' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: '支付状态' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 10;
}

export class CreateQrCodeDto {
  @ApiProperty({ description: '订单ID' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({ description: '客户端IP' })
  @IsString()
  @IsOptional()
  clientIp?: string;
}

export class RefundDto {
  @ApiProperty({ description: '订单ID' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: '退款金额', example: 100.00 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: '退款原因' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class PaymentCallbackDto {
  @ApiProperty({ description: '支付方式' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiProperty({ description: '回调数据' })
  @IsNotEmpty()
  data: any;
}
