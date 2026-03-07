import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { InvoiceService } from "./invoice.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import { QueryInvoiceDto } from "./dto/query-invoice.dto";

@ApiTags("invoices")
@Controller("invoices")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @ApiOperation({ summary: "创建开票记录" })
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.create(createInvoiceDto);
  }

  @Get()
  @ApiOperation({ summary: "获取开票记录列表" })
  findAll(@Query() query: QueryInvoiceDto) {
    return this.invoiceService.findAll(query);
  }

  @Get("customer/:customerId/summary")
  @ApiOperation({ summary: "获取客户开票汇总" })
  getCustomerSummary(
    @Param("customerId") customerId: string,
    @Query("month") month?: string,
  ) {
    return this.invoiceService.getCustomerInvoiceSummary(customerId, month);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取开票记录详情" })
  findOne(@Param("id") id: string) {
    return this.invoiceService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "更新开票记录" })
  update(@Param("id") id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoiceService.update(id, updateInvoiceDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除开票记录" })
  remove(@Param("id") id: string) {
    return this.invoiceService.remove(id);
  }
}
