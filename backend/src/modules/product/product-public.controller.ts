import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ProductService } from "./product.service";
import { QueryProductDto } from "./dto/query-product.dto";

@ApiTags("public-products")
@Controller("public/products")
export class ProductPublicController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: "Get published products list" })
  findPublishedProducts(@Query() query: QueryProductDto) {
    return this.productService.findAll({
      ...query,
      status: "ACTIVE", // 仅返回启用状态的产品
    });
  }

  @Get(":code")
  @ApiOperation({ summary: "Get product by code" })
  findByCode(@Param("code") code: string) {
    return this.productService.findByCode(code);
  }
}
