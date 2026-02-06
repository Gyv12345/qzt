import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PaymentConfigService } from "../services/payment-config.service";
import {
  CreatePaymentConfigDto,
  UpdatePaymentConfigDto,
  QueryPaymentConfigDto,
} from "../dto/payment-config.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";

@ApiTags("payment-configs")
@Controller("payment/configs")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentConfigController {
  constructor(private readonly configService: PaymentConfigService) {}

  @Post()
  @ApiOperation({ summary: "创建支付配置" })
  async create(@Body() createDto: CreatePaymentConfigDto) {
    const config = await this.configService.create(createDto);
    return {
      success: true,
      data: config,
      message: "创建成功",
    };
  }

  @Put(":id")
  @ApiOperation({ summary: "更新支付配置" })
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdatePaymentConfigDto,
  ) {
    const config = await this.configService.update(id, updateDto);
    return {
      success: true,
      data: config,
      message: "更新成功",
    };
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除支付配置" })
  async delete(@Param("id") id: string) {
    const config = await this.configService.delete(id);
    return {
      success: true,
      data: config,
      message: "删除成功",
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "获取支付配置详情" })
  async findOne(@Param("id") id: string) {
    const config = await this.configService.findById(id);
    if (!config) {
      return {
        success: false,
        message: "配置不存在",
      };
    }

    // 不返回敏感信息
    const { appSecret, apiKey, ...safeConfig } = config;

    return {
      success: true,
      data: safeConfig,
    };
  }

  @Get()
  @ApiOperation({ summary: "获取支付配置列表" })
  async findAll(@Query() query: QueryPaymentConfigDto) {
    const configs = await this.configService.findAll(query);

    // 不返回敏感信息
    const safeConfigs = configs.map(
      ({ appSecret, apiKey, ...config }) => config,
    );

    return {
      success: true,
      data: safeConfigs,
    };
  }

  @Patch(":id/toggle")
  @ApiOperation({ summary: "启用/禁用支付配置" })
  async toggle(@Param("id") id: string) {
    const config = await this.configService.toggleEnabled(id);
    return {
      success: true,
      data: config,
      message: `配置已${config.status === 1 ? "启用" : "禁用"}`,
    };
  }

  @Get("active/:paymentMethod/:paymentChannel")
  @ApiOperation({ summary: "获取激活的支付配置" })
  async getActiveConfig(
    @Param("paymentMethod") paymentMethod: string,
    @Param("paymentChannel") paymentChannel: string,
  ) {
    const config = await this.configService.getActiveConfig(
      paymentMethod,
      paymentChannel,
    );

    if (!config) {
      return {
        success: false,
        message: "未找到激活的配置",
      };
    }

    // 不返回敏感信息
    const { appSecret, apiKey, ...safeConfig } = config;

    return {
      success: true,
      data: safeConfig,
    };
  }
}
