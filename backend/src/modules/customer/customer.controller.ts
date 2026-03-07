import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  StreamableFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CustomerService } from "./customer.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { QueryCustomerDto } from "./dto/query-customer.dto";
import { AssignDto, BatchAssignDto } from "./dto/batch-assign.dto";
import {
  BatchUpdateCustomersDto,
  BatchDeleteCustomersDto,
  BatchTagsCustomersDto,
} from "./dto/batch-update-customers.dto";

@ApiTags("customers")
@Controller("customers")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @ApiOperation({ summary: "创建客户" })
  create(@Body() createCustomerDto: CreateCustomerDto, @Request() req) {
    return this.customerService.create(createCustomerDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: "获取客户列表" })
  findAll(@Request() req, @Query() query: QueryCustomerDto) {
    return this.customerService.findAll(
      query,
      req.user.userId,
      req.user.isAdmin,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "获取客户详情" })
  findOne(@Param("id") id: string, @Request() req) {
    return this.customerService.findOne(id, req.user.userId, req.user.isAdmin);
  }

  @Patch(":id")
  @ApiOperation({ summary: "更新客户" })
  update(
    @Param("id") id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Request() req,
  ) {
    return this.customerService.update(
      id,
      updateCustomerDto,
      req.user.userId,
      req.user.isAdmin,
    );
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除客户" })
  remove(@Param("id") id: string, @Request() req) {
    return this.customerService.remove(id, req.user.userId, req.user.isAdmin);
  }

  @Patch(":id/assign")
  @ApiOperation({ summary: "分配单个客户" })
  assignOne(
    @Param("id") id: string,
    @Body() assignDto: AssignDto,
    @Request() req,
  ) {
    return this.customerService.assignOne(
      id,
      assignDto.newFollowUserId,
      assignDto.reason,
      req.user.userId,
      req.user.isAdmin,
    );
  }

  @Patch("batch-assign")
  @ApiOperation({ summary: "批量分配客户" })
  batchAssign(@Body() batchAssignDto: BatchAssignDto, @Request() req) {
    return this.customerService.batchAssign(
      batchAssignDto.customerIds,
      batchAssignDto.newFollowUserId,
      batchAssignDto.reason,
      req.user.userId,
      req.user.isAdmin,
    );
  }

  @Patch("batch-update")
  @ApiOperation({ summary: "批量更新客户" })
  batchUpdate(@Body() batchUpdateDto: BatchUpdateCustomersDto, @Request() req) {
    return this.customerService.batchUpdate(
      batchUpdateDto.customerIds,
      batchUpdateDto,
      req.user.userId,
      req.user.isAdmin,
    );
  }

  @Delete("batch-delete")
  @ApiOperation({ summary: "批量删除客户" })
  batchDelete(@Body() batchDeleteDto: BatchDeleteCustomersDto, @Request() req) {
    return this.customerService.batchDelete(
      batchDeleteDto.customerIds,
      req.user.userId,
      req.user.isAdmin,
    );
  }

  @Patch("batch-tags")
  @ApiOperation({ summary: "批量管理客户标签" })
  batchTags(@Body() batchTagsDto: BatchTagsCustomersDto, @Request() req) {
    return this.customerService.batchTags(
      batchTagsDto.customerIds,
      batchTagsDto.tags,
      batchTagsDto.operation,
      req.user.userId,
      req.user.isAdmin,
    );
  }

  @Get(":id/assignment-history")
  @ApiOperation({ summary: "查询客户分配历史" })
  getAssignmentHistory(
    @Param("id") id: string,
    @Query() query: { page?: number; pageSize?: number },
    @Request() req,
  ) {
    return this.customerService.getAssignmentHistory(
      id,
      query.page || 1,
      query.pageSize || 20,
      req.user.userId,
      req.user.isAdmin,
    );
  }

  @Get(":id/follow-records")
  @ApiOperation({ summary: "查询客户跟进记录" })
  getFollowRecords(
    @Param("id") id: string,
    @Query() query: { page?: number; pageSize?: number },
    @Request() req,
  ) {
    return this.customerService.getFollowRecords(
      id,
      query.page || 1,
      query.pageSize || 20,
      req.user.userId,
      req.user.isAdmin,
    );
  }

  @Post("import")
  @ApiOperation({ summary: "批量导入客户" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async importCustomers(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException("请上传文件");
    }
    return this.customerService.importCustomers(
      file,
      req.user.userId,
      req.user.isAdmin,
    );
  }

  @Get("export")
  @ApiOperation({ summary: "导出客户数据" })
  async exportCustomers(@Query() query: QueryCustomerDto, @Request() req) {
    const buffer = await this.customerService.exportCustomers(
      query,
      req.user.userId,
      req.user.isAdmin,
    );
    return new StreamableFile(buffer, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="customers_${Date.now()}.xlsx"`,
    });
  }

  @Get("import-template")
  @ApiOperation({ summary: "下载客户导入模板" })
  async downloadImportTemplate() {
    const buffer = await this.customerService.generateImportTemplate();
    return new StreamableFile(buffer, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="customer_import_template.xlsx"`,
    });
  }

  @Get("statistics/level-distribution")
  @ApiOperation({ summary: "客户等级分布统计" })
  getLevelDistribution(@Request() req) {
    return this.customerService.getLevelDistribution(
      req.user.userId,
      req.user.isAdmin,
    );
  }

  @Get("statistics/conversion-rate")
  @ApiOperation({ summary: "客户转化率分析" })
  getConversionRate(@Query() query: { months?: number }, @Request() req) {
    return this.customerService.getConversionRate(
      query.months || 6,
      req.user.userId,
      req.user.isAdmin,
    );
  }

  @Get("statistics/growth-trend")
  @ApiOperation({ summary: "客户增长趋势" })
  getGrowthTrend(@Query() query: { months?: number }, @Request() req) {
    return this.customerService.getGrowthTrend(
      query.months || 6,
      req.user.userId,
      req.user.isAdmin,
    );
  }
}
