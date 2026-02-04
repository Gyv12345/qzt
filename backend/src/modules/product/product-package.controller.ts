import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductPackageService } from './product-package.service';

@ApiTags('产品套餐')
@Controller('product-packages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductPackageController {
  constructor(private readonly productPackageService: ProductPackageService) {}

  @Get()
  @ApiOperation({ summary: '获取所有产品套餐' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Query('includeProducts') includeProducts?: string) {
    return this.productPackageService.findAll(includeProducts === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: '获取套餐详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findOne(@Param('id') id: string) {
    return this.productPackageService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建产品套餐' })
  @ApiResponse({ status: 201, description: '创建成功' })
  create(@Body() data: {
    name: string;
    code: string;
    description?: string;
    discount?: number;
    duration?: number;
    productIds?: string[];
  }) {
    return this.productPackageService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新产品套餐' })
  @ApiResponse({ status: 200, description: '更新成功' })
  update(
    @Param('id') id: string,
    @Body() data: {
      name?: string;
      description?: string;
      discount?: number;
      duration?: number;
      productIds?: string[];
      status?: number;
    },
  ) {
    return this.productPackageService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除产品套餐' })
  @ApiResponse({ status: 200, description: '删除成功' })
  remove(@Param('id') id: string) {
    return this.productPackageService.remove(id);
  }

  @Post(':id/products')
  @ApiOperation({ summary: '添加产品到套餐' })
  @ApiResponse({ status: 200, description: '添加成功' })
  addProduct(
    @Param('id') packageId: string,
    @Body() data: { productId: string },
  ) {
    return this.productPackageService.addProduct(packageId, data.productId);
  }

  @Delete(':id/products/:productId')
  @ApiOperation({ summary: '从套餐中移除产品' })
  @ApiResponse({ status: 200, description: '移除成功' })
  removeProduct(
    @Param('id') packageId: string,
    @Param('productId') productId: string,
  ) {
    return this.productPackageService.removeProduct(packageId, productId);
  }
}
