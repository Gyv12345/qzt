import { ApiProperty } from "@nestjs/swagger";

export class DashboardOverviewDto {
  @ApiProperty({ description: "总客户数" })
  totalCustomers: number;

  @ApiProperty({ description: "合同总数" })
  totalContracts: number;

  @ApiProperty({ description: "产品总数" })
  totalProducts: number;

  @ApiProperty({ description: "开票记录总数" })
  totalInvoices: number;
}

export class DashboardMonthlyDto {
  @ApiProperty({ description: "本月新增客户" })
  newCustomers: number;

  @ApiProperty({ description: "本月新增合同" })
  newContracts: number;

  @ApiProperty({ description: "本月合同金额" })
  contractAmount: number;

  @ApiProperty({ description: "本月开票金额" })
  invoiceAmount: number;
}

export class DashboardStatsDto {
  @ApiProperty({ description: "总览数据", type: DashboardOverviewDto })
  overview: DashboardOverviewDto;

  @ApiProperty({ description: "本月数据", type: DashboardMonthlyDto })
  monthly: DashboardMonthlyDto;

  @ApiProperty({ description: "最近活动", type: Array, isArray: true })
  recentActivities: any[];

  @ApiProperty({ description: "未读通知数" })
  unreadNotifications: number;
}
