import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiProperty,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CustomerRuleService } from "./customer-rule.service";
import { CreateCustomerRuleDto } from "./dto/create-customer-rule.dto";
import { UpdateCustomerRuleDto } from "./dto/update-customer-rule.dto";

// Swagger 响应 DTO（用于生成正确的 OpenAPI 类型）
class CustomerRuleResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  code: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description: string | null;

  @ApiProperty()
  daysValue: number;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

class InitializeResultResponse {
  @ApiProperty()
  action: "created" | "skipped";

  @ApiProperty()
  rule: CustomerRuleResponse;
}

@ApiTags("customer-rules")
@Controller("customer-rules")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomerRuleController {
  constructor(private readonly customerRuleService: CustomerRuleService) {}

  @Get()
  @ApiOperation({ summary: "获取所有客户规则" })
  @ApiResponse({
    status: 200,
    description: "查询成功",
    type: [CustomerRuleResponse],
  })
  findAll() {
    return this.customerRuleService.findAll();
  }

  @Get("code/:code")
  @ApiOperation({ summary: "通过 code 获取规则" })
  @ApiResponse({
    status: 200,
    description: "查询成功",
    type: CustomerRuleResponse,
  })
  findByCode(@Param("code") code: string) {
    return this.customerRuleService.findByCode(code);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取单个规则（通过 ID）" })
  @ApiResponse({
    status: 200,
    description: "查询成功",
    type: CustomerRuleResponse,
  })
  findOne(@Param("id") id: string) {
    return this.customerRuleService.findOne(Number(id));
  }

  @Post()
  @ApiOperation({ summary: "创建新规则（仅用于初始化预设规则）" })
  @ApiResponse({
    status: 201,
    description: "创建成功",
    type: CustomerRuleResponse,
  })
  create(@Body() createCustomerRuleDto: CreateCustomerRuleDto) {
    return this.customerRuleService.create(createCustomerRuleDto);
  }

  @Post("initialize")
  @ApiOperation({ summary: "初始化预设规则" })
  @ApiResponse({
    status: 201,
    description: "初始化成功",
    type: [InitializeResultResponse],
  })
  initializeDefaultRules() {
    return this.customerRuleService.initializeDefaultRules();
  }

  @Patch(":id")
  @ApiOperation({ summary: "更新规则" })
  @ApiResponse({
    status: 200,
    description: "更新成功",
    type: CustomerRuleResponse,
  })
  update(
    @Param("id") id: string,
    @Body() updateCustomerRuleDto: UpdateCustomerRuleDto,
  ) {
    return this.customerRuleService.update(Number(id), updateCustomerRuleDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除规则" })
  @ApiResponse({
    status: 200,
    description: "删除成功",
    type: CustomerRuleResponse,
  })
  remove(@Param("id") id: string) {
    return this.customerRuleService.remove(Number(id));
  }
}
