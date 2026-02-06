import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PricingService } from "./pricing.service";
import { CreatePricingRuleDto } from "./dto/create-pricing-rule.dto";
import { UpdatePricingRuleDto } from "./dto/update-pricing-rule.dto";
import { CalculatePriceDto } from "./dto/calculate-price.dto";

@ApiTags("pricing")
@Controller("pricing")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post("rules")
  @ApiOperation({ summary: "创建定价规则" })
  createRule(@Body() createPricingRuleDto: CreatePricingRuleDto) {
    return this.pricingService.create(createPricingRuleDto);
  }

  @Get("rules")
  @ApiOperation({ summary: "查询所有定价规则" })
  findAllRules(@Query("productId") productId?: string) {
    return this.pricingService.findAll(productId);
  }

  @Get("rules/:id")
  @ApiOperation({ summary: "查询单个定价规则" })
  findOneRule(@Param("id") id: string) {
    return this.pricingService.findOne(id);
  }

  @Get("products/:productId/rules")
  @ApiOperation({ summary: "查询产品的定价规则" })
  findByProduct(@Param("productId") productId: string) {
    return this.pricingService.findByProduct(productId);
  }

  @Patch("rules/:id")
  @ApiOperation({ summary: "更新定价规则" })
  updateRule(
    @Param("id") id: string,
    @Body() updatePricingRuleDto: UpdatePricingRuleDto,
  ) {
    return this.pricingService.update(id, updatePricingRuleDto);
  }

  @Delete("rules/:id")
  @ApiOperation({ summary: "删除定价规则" })
  removeRule(@Param("id") id: string) {
    return this.pricingService.remove(id);
  }

  @Post("calculate")
  @ApiOperation({ summary: "计算服务价格" })
  calculatePrice(@Body() calculatePriceDto: CalculatePriceDto) {
    return this.pricingService.calculatePrice(calculatePriceDto);
  }
}
