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
import { ServiceTeamService } from "./service-team.service";
import { CreateServiceTeamDto } from "./dto/create-service-team.dto";
import { UpdateServiceTeamDto } from "./dto/update-service-team.dto";

@ApiTags("service-teams")
@Controller("service-teams")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ServiceTeamController {
  constructor(private readonly serviceTeamService: ServiceTeamService) {}

  @Post()
  @ApiOperation({ summary: "添加服务团队成员" })
  create(@Body() createDto: CreateServiceTeamDto) {
    return this.serviceTeamService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: "获取服务团队列表" })
  findAll(@Query("customerId") customerId?: string) {
    return this.serviceTeamService.findAll(customerId);
  }

  @Get("customer/:customerId/grouped")
  @ApiOperation({ summary: "获取客户的服务团队(按角色分组)" })
  getCustomerTeamGrouped(@Param("customerId") customerId: string) {
    return this.serviceTeamService.getCustomerTeamGrouped(customerId);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取服务团队成员详情" })
  findOne(@Param("id") id: string) {
    return this.serviceTeamService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "更新服务团队成员" })
  update(@Param("id") id: string, @Body() updateDto: UpdateServiceTeamDto) {
    return this.serviceTeamService.update(id, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除服务团队成员" })
  remove(@Param("id") id: string) {
    return this.serviceTeamService.remove(id);
  }
}
