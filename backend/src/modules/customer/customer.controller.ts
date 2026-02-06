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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CustomerService } from "./customer.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { QueryCustomerDto } from "./dto/query-customer.dto";
import { AssignDto, BatchAssignDto } from "./dto/batch-assign.dto";

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
}
