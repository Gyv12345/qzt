import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentOrderService } from '../services/payment-order.service';
import {
  CreatePaymentOrderDto,
  UpdatePaymentOrderDto,
  QueryPaymentOrderDto,
  CreateQrCodeDto,
  RefundDto,
} from '../dto/payment-order.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('payment-orders')
@Controller('payment/orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentOrderController {
  constructor(private readonly orderService: PaymentOrderService) {}

  @Post()
  @ApiOperation({ summary: '创建支付订单' })
  async create(@Body() createDto: CreatePaymentOrderDto, @Req() req: any) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const order = await this.orderService.create({
      ...createDto,
      clientIp,
    });
    return {
      success: true,
      data: order,
      message: '创建成功',
    };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新支付订单' })
  async update(@Param('id') id: string, @Body() updateDto: UpdatePaymentOrderDto) {
    const order = await this.orderService.update(id, updateDto);
    return {
      success: true,
      data: order,
      message: '更新成功',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除支付订单' })
  async delete(@Param('id') id: string) {
    const order = await this.orderService.delete(id);
    return {
      success: true,
      data: order,
      message: '删除成功',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取支付订单详情' })
  async findOne(@Param('id') id: string) {
    const order = await this.orderService.findById(id);
    if (!order) {
      return {
        success: false,
        message: '订单不存在',
      };
    }
    return {
      success: true,
      data: order,
    };
  }

  @Get()
  @ApiOperation({ summary: '获取支付订单列表' })
  async findAll(@Query() query: QueryPaymentOrderDto) {
    const result = await this.orderService.findAll(query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  @Post('qrcode')
  @ApiOperation({ summary: '生成支付二维码' })
  async generateQrCode(@Body() dto: CreateQrCodeDto, @Req() req: any) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const result = await this.orderService.generateQrCode(dto.orderId, clientIp);
    return {
      success: true,
      data: result,
      message: '生成成功',
    };
  }

  @Post('refund')
  @ApiOperation({ summary: '申请退款' })
  async refund(@Body() dto: RefundDto) {
    const order = await this.orderService.refund(dto.orderId, dto.amount, dto.reason);
    return {
      success: true,
      data: order,
      message: '退款申请已提交',
    };
  }

  @Post('cancel/:id')
  @ApiOperation({ summary: '取消订单' })
  async cancelOrder(@Param('id') id: string) {
    const order = await this.orderService.cancelOrder(id);
    return {
      success: true,
      data: order,
      message: '取消成功',
    };
  }

  @Get('status/:orderNo')
  @ApiOperation({ summary: '查询订单状态' })
  async checkOrderStatus(@Param('orderNo') orderNo: string) {
    const status = await this.orderService.checkOrderStatus(orderNo);
    return {
      success: true,
      data: status,
    };
  }
}
