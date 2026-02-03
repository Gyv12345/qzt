import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateProductFlowDto } from './dto/create-product-flow.dto';
import { UpdateProductFlowDto } from './dto/update-product-flow.dto';

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: '创建产品' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: '获取产品列表' })
  findAll(@Query() query: QueryProductDto) {
    return this.productService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取产品详情' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新产品' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除产品' })
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  // ==================== 产品流程管理 ====================

  @Post('flows')
  @ApiOperation({ summary: '创建产品流程' })
  createFlow(@Body() createFlowDto: CreateProductFlowDto) {
    return this.productService.createFlow(createFlowDto);
  }

  @Get('flows')
  @ApiOperation({ summary: '获取产品流程列表' })
  findFlows(@Query('productId') productId?: string) {
    return this.productService.findFlows(productId);
  }

  @Get('flows/:id')
  @ApiOperation({ summary: '获取产品流程详情' })
  findFlow(@Param('id') id: string) {
    return this.productService.findFlow(id);
  }

  @Patch('flows/:id')
  @ApiOperation({ summary: '更新产品流程' })
  updateFlow(@Param('id') id: string, @Body() updateFlowDto: UpdateProductFlowDto) {
    return this.productService.updateFlow(id, updateFlowDto);
  }

  @Delete('flows/:id')
  @ApiOperation({ summary: '删除产品流程' })
  removeFlow(@Param('id') id: string) {
    return this.productService.removeFlow(id);
  }
}
