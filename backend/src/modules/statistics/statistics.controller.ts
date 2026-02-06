import { Controller, Get, Query, UseGuards, Request } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { StatisticsService } from "./statistics.service";
import { DashboardStatsDto } from "./dto/dashboard-stats.dto";

@ApiTags("statistics")
@Controller("statistics")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "获取首页仪表板数据" })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: DashboardStatsDto,
  })
  getDashboardStats() {
    return this.statisticsService.getDashboardStats();
  }

  @Get("customer-growth")
  @ApiOperation({ summary: "获取客户增长趋势" })
  @ApiQuery({ name: "months", required: false, type: Number })
  getCustomerGrowthTrend(@Query("months") months?: number) {
    return this.statisticsService.getCustomerGrowthTrend(months);
  }

  @Get("contract-renewal")
  @ApiOperation({ summary: "获取合同续约率统计" })
  @ApiQuery({ name: "months", required: false, type: Number })
  getContractRenewalStats(@Query("months") months?: number) {
    return this.statisticsService.getContractRenewalStats(months);
  }

  @Get("invoice-analysis")
  @ApiOperation({ summary: "获取开票金额分析" })
  @ApiQuery({ name: "months", required: false, type: Number })
  getInvoiceAnalysis(@Query("months") months?: number) {
    return this.statisticsService.getInvoiceAnalysis(months);
  }

  @Get("sales-performance")
  @ApiOperation({ summary: "获取销售业绩排行" })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  getSalesPerformance(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.statisticsService.getSalesPerformance(start, end);
  }

  @Get("product-sales")
  @ApiOperation({ summary: "获取产品销售统计" })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  getProductSalesStats(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.statisticsService.getProductSalesStats(start, end);
  }

  @Get("export")
  @ApiOperation({ summary: "导出数据" })
  @ApiQuery({
    name: "type",
    required: true,
    enum: ["customers", "contracts", "invoices"],
  })
  exportData(@Query("type") type: string, @Query() filters: any) {
    return this.statisticsService.exportData(type, filters);
  }
}
