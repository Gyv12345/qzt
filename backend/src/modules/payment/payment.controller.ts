import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: '创建收款记录' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.create(createPaymentDto);
  }

  @Get()
  @ApiOperation({ summary: '获取收款记录列表' })
  findAll(@Query() query: QueryPaymentDto) {
    return this.paymentService.findAll(query);
  }

  @Get('contract/:contractId')
  @ApiOperation({ summary: '获取合同的收款记录' })
  getContractPayments(@Param('contractId') contractId: string) {
    return this.paymentService.getContractPayments(contractId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取收款记录详情' })
  findOne(@Param('id') id: string) {
    return this.paymentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新收款记录' })
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentService.update(id, updatePaymentDto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: '确认收款' })
  confirmPayment(@Param('id') id: string) {
    return this.paymentService.confirmPayment(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除收款记录' })
  remove(@Param('id') id: string) {
    return this.paymentService.remove(id);
  }
}
