import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StatisticsService } from './statistics.service';

@ApiTags('statistics')
@Controller('statistics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '获取首页仪表板统计数据' })
  getDashboardStats() {
    return this.statisticsService.getDashboardStats();
  }

  @Get('performance')
  @ApiOperation({ summary: '获取业绩统计数据' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  getPerformanceStats(@Query('year') year?: string) {
    return this.statisticsService.getPerformanceStats(year ? parseInt(year) : undefined);
  }

  @Get('customers')
  @ApiOperation({ summary: '获取客户分析数据' })
  getCustomerAnalysis() {
    return this.statisticsService.getCustomerAnalysis();
  }

  @Get('payments')
  @ApiOperation({ summary: '获取收款统计数据' })
  @ApiQuery({ name: 'month', required: false, type: String })
  getPaymentStats(@Query('month') month?: string) {
    return this.statisticsService.getPaymentStats(month);
  }

  @Get('invoices')
  @ApiOperation({ summary: '获取开票统计数据' })
  @ApiQuery({ name: 'month', required: false, type: String })
  getInvoiceStats(@Query('month') month?: string) {
    return this.statisticsService.getInvoiceStats(month);
  }
}
