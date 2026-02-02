# 企账通完整业务系统实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 基于 React + Tailwind + shadcn/ui 前端和 NestJS + Prisma 后端,实现完整的业务管理系统

**Architecture:**
- 后端: NestJS + Prisma ORM (开发SQLite, 生产MySQL)
- 前端: React 18 + Vite + Tailwind CSS + shadcn/ui (响应式设计)
- 移动端: 响应式布局,PC/移动端共用代码
- 认证: JWT + RBAC权限系统
- 自动化: 事件驱动的规则引擎

**Tech Stack:**
- NestJS 10.x, Prisma 5.x, JWT, Swagger
- React 18, Vite 5, React Router v7, Zustand, TanStack Query
- Tailwind CSS v3, shadcn/ui, Lucide React
- 响应式断点: PC(≥768px), Mobile(<768px)

**Branch:** `feat/react-tailwind-frontend`
**Port:** Frontend 3456, Backend 7890

---

## 阶段一:产品管理模块 (1周)

### Task 1: 后端 - 产品管理 API

**目标:** 实现产品的 CRUD 操作和查询功能

**Files:**
- Create: `backend/src/modules/product/product.module.ts`
- Create: `backend/src/modules/product/product.controller.ts`
- Create: `backend/src/modules/product/product.service.ts`
- Create: `backend/src/modules/product/dto/create-product.dto.ts`
- Create: `backend/src/modules/product/dto/update-product.dto.ts`
- Create: `backend/src/modules/product/dto/query-product.dto.ts`

**主要功能:**
- 产品创建、编辑、删除、查询
- 产品流程配置(NODE/CYCLE)
- 产品状态管理
- 分页和搜索

**Step 1: 创建 DTO**

创建 `backend/src/modules/product/dto/create-product.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ description: '产品名称', example: '财税基础套餐' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '产品代码', example: 'FIN_BASE_001' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: '产品描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '价格', example: 5000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: '开票额度(月)', example: 10 })
  @IsNumber()
  @Min(0)
  invoiceLimit: number;

  @ApiProperty({ description: '套餐包含开票张数(月)', example: 50 })
  @IsNumber()
  @Min(0)
  invoiceCount: number;

  @ApiProperty({ description: '超额单价', example: 20 })
  @IsNumber()
  @Min(0)
  overLimitPrice: number;
}
```

创建 `backend/src/modules/product/dto/update-product.dto.ts`:
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

创建 `backend/src/modules/product/dto/query-product.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryProductDto {
  @ApiProperty({ description: '页码', default: 1, required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  page?: number = 1;

  @ApiProperty({ description: '每页数量', default: 10, required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  pageSize?: number = 10;

  @ApiProperty({ description: '搜索关键词', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '状态', required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  status?: number;
}
```

**Step 2: 创建 Service**

创建 `backend/src/modules/product/product.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    return this.prisma.product.create({
      data: createProductDto,
    });
  }

  async findAll(query: QueryProductDto) {
    const { page = 1, pageSize = 10, keyword, status } = query;
    const skip = (page - 1) * pageSize;

    let where: any = {};

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
      ];
    }

    if (status !== undefined) {
      where.status = status;
    }

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      data,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        flows: {
          where: { enabled: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: 'Product deleted successfully' };
  }
}
```

**Step 3: 创建 Controller**

创建 `backend/src/modules/product/product.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

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
}
```

**Step 4: 创建 Module 并注册**

创建 `backend/src/modules/product/product.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
```

修改 `backend/src/app.module.ts`:
```typescript
import { ProductModule } from './modules/product/product.module';

@Module({
  imports: [
    // ...
    ProductModule,
  ],
})
export class AppModule {}
```

**Step 5: 测试 API**

```bash
cd backend
pnpm run start:dev
# 访问 http://localhost:7890/api-docs
```

**Step 6: 提交代码**

```bash
git add backend/src/modules/product
git commit -m "feat: implement product management module"
```

**验证标准:**
- ✅ Swagger API 文档完整
- ✅ 所有 CRUD 接口测试通过
- ✅ 产品流程配置可正常保存

---

### Task 2: 前端 - 产品列表页面

**目标:** 实现 PC 端和移动端响应式产品列表

**Files:**
- Create: `frontend/src/pages/product/ProductListPage.tsx`
- Create: `frontend/src/components/common/ProductCard.tsx`
- Create: `frontend/src/components/common/ProductTable.tsx`
- Create: `frontend/src/components/common/ProductModal.tsx`

**Step 1: 修改 Orval 配置并生成 API**

确保 `frontend/orval.config.ts` 包含 products:

```typescript
export default {
  backend: {
    output: './src/services',
    url: 'http://localhost:7890/api-docs-json',
    openapi: true,
    definitions: {
      query: {
        useQuery: true,
      },
      mutation: {
        useMutation: true,
      },
    },
  },
}
```

生成 API:
```bash
cd frontend
pnpm generate:api
```

**Step 2: 创建产品列表页面**

创建 `frontend/src/pages/product/ProductListPage.tsx`:
```typescript
import { useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { ProductTable } from '@/components/common/ProductTable'
import { ProductCard } from '@/components/common/ProductCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProducts } from '@/services'
import ProductModal from '@/components/common/ProductModal'

export default function ProductListPage() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalVisible, setModalVisible] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<any>(null)

  const { data, isLoading, error, refetch } = useProducts({
    page,
    pageSize: isMobile ? 20 : 10,
    keyword: search || undefined,
  })

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>加载失败</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">产品管理</h1>
        <Button onClick={() => { setCurrentProduct(null); setModalVisible(true) }}>
          新建产品
        </Button>
      </div>

      <Input
        placeholder="搜索产品名称、代码"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {isMobile ? (
        <div className="grid gap-4">
          {data?.data?.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <ProductTable
          products={data?.data || []}
          total={data?.total || 0}
          page={page}
          onPageChange={setPage}
          onEdit={(product) => { setCurrentProduct(product); setModalVisible(true) }}
        />
      )}

      <ProductModal
        visible={modalVisible}
        onCancel={() => { setModalVisible(false); setCurrentProduct(null) }}
        onSuccess={() => { setModalVisible(false); setCurrentProduct(null); refetch() }}
        currentProduct={currentProduct}
      />
    </div>
  )
}
```

**Step 3: 创建产品卡片组件(移动端)**

创建 `frontend/src/components/common/ProductCard.tsx`:
```typescript
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg">{product.name}</h3>
        <Badge variant={product.status === 1 ? 'default' : 'secondary'}>
          {product.status === 1 ? '启用' : '禁用'}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">代码:</span>
          <span>{product.code}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">价格:</span>
          <span className="font-semibold">¥{product.price}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">开票额度:</span>
          <span>{product.invoiceLimit}/月</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">包含张数:</span>
          <span>{product.invoiceCount}张/月</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">超额单价:</span>
          <span>¥{product.overLimitPrice}</span>
        </div>
      </div>
    </Card>
  )
}
```

**Step 4: 创建产品表格组件(PC端)**

创建 `frontend/src/components/common/ProductTable.tsx`:
```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ProductTableProps {
  products: any[]
  total: number
  page: number
  onPageChange: (page: number) => void
  onEdit: (product: any) => void
}

export function ProductTable({
  products,
  total,
  page,
  onPageChange,
  onEdit,
}: ProductTableProps) {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>产品名称</TableHead>
            <TableHead>产品代码</TableHead>
            <TableHead>价格</TableHead>
            <TableHead>开票额度</TableHead>
            <TableHead>包含张数</TableHead>
            <TableHead>超额单价</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{product.code}</TableCell>
              <TableCell>¥{product.price}</TableCell>
              <TableCell>{product.invoiceLimit}/月</TableCell>
              <TableCell>{product.invoiceCount}张</TableCell>
              <TableCell>¥{product.overLimitPrice}</TableCell>
              <TableCell>
                <Badge variant={product.status === 1 ? 'default' : 'secondary'}>
                  {product.status === 1 ? '启用' : '禁用'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(product)}>
                    编辑
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          上一页
        </Button>
        <span className="flex items-center px-4">第 {page} 页</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page * 10 >= total}
        >
          下一页
        </Button>
      </div>
    </div>
  )
}
```

**Step 5: 创建产品弹窗组件**

创建 `frontend/src/components/common/ProductModal.tsx`:
```typescript
import { useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProduct, updateProduct } from '@/services'

interface ProductModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
  currentProduct?: any
}

export default function ProductModal({
  visible,
  onCancel,
  onSuccess,
  currentProduct,
}: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    price: 0,
    invoiceLimit: 0,
    invoiceCount: 0,
    overLimitPrice: 0,
  })

  useEffect(() => {
    if (visible && currentProduct) {
      setFormData(currentProduct)
    } else if (visible) {
      setFormData({
        name: '',
        code: '',
        description: '',
        price: 0,
        invoiceLimit: 0,
        invoiceCount: 0,
        overLimitPrice: 0,
      })
    }
  }, [visible, currentProduct])

  const handleSubmit = async () => {
    try {
      if (currentProduct) {
        await updateProduct(currentProduct.id, formData)
      } else {
        await createProduct(formData)
      }
      onSuccess()
    } catch (error) {
      console.error('保存失败', error)
    }
  }

  return (
    <Dialog open={visible} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{currentProduct ? '编辑产品' : '新建产品'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">产品名称</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="code">产品代码</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="description">产品描述</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">价格</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="invoiceLimit">开票额度(月)</Label>
              <Input
                id="invoiceLimit"
                type="number"
                value={formData.invoiceLimit}
                onChange={(e) => setFormData({ ...formData, invoiceLimit: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="invoiceCount">包含张数(月)</Label>
              <Input
                id="invoiceCount"
                type="number"
                value={formData.invoiceCount}
                onChange={(e) => setFormData({ ...formData, invoiceCount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="overLimitPrice">超额单价</Label>
              <Input
                id="overLimitPrice"
                type="number"
                value={formData.overLimitPrice}
                onChange={(e) => setFormData({ ...formData, overLimitPrice: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 6: 添加路由**

修改 `frontend/src/App.tsx`:
```typescript
import { ProductListPage } from '@/pages/product/ProductListPage'

// 在 Routes 中添加
<Route
  path="/products"
  element={
    <ProtectedRoute>
      <ProductListPage />
    </ProtectedRoute>
  }
/>
```

**Step 7: 测试页面**

```bash
cd frontend
pnpm dev
# 访问 http://localhost:3456/products
```

**Step 8: 提交代码**

```bash
git add frontend/src
git commit -m "feat: implement product list page with responsive design"
```

**验证标准:**
- ✅ PC 端表格展示正常
- ✅ 移动端卡片展示正常
- ✅ 创建和编辑功能正常

---

### Task 3: 前端 - 产品详情页面

**目标:** 实现产品详情和流程配置页面

**Files:**
- Create: `frontend/src/pages/product/ProductDetailPage.tsx`
- Create: `frontend/src/components/product/FlowConfig.tsx`

**主要功能:**
- 产品基础信息展示
- 产品流程配置界面
- 流程可视化(节点图/周期图)
- 价格和开票额度配置

**Step 1: 创建产品详情页面**

创建 `frontend/src/pages/product/ProductDetailPage.tsx`:
```typescript
import { useParams } from 'react-router-dom'
import { useProduct } from '@/services'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import FlowConfig from '@/components/product/FlowConfig'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: product, isLoading, error } = useProduct(id!)

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>加载失败</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{product?.name}</h1>
        <Button>编辑产品</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">产品信息</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">产品代码:</span>
                <p className="font-medium">{product?.code}</p>
              </div>
              <div>
                <span className="text-muted-foreground">价格:</span>
                <p className="font-medium text-lg">¥{product?.price}</p>
              </div>
              <div>
                <span className="text-muted-foreground">开票额度:</span>
                <p className="font-medium">{product?.invoiceLimit}/月</p>
              </div>
              <div>
                <span className="text-muted-foreground">包含张数:</span>
                <p className="font-medium">{product?.invoiceCount}张/月</p>
              </div>
              <div>
                <span className="text-muted-foreground">超额单价:</span>
                <p className="font-medium">¥{product?.overLimitPrice}</p>
              </div>
              <div>
                <span className="text-muted-foreground">状态:</span>
                <div className="mt-1">
                  <Badge variant={product?.status === 1 ? 'default' : 'secondary'}>
                    {product?.status === 1 ? '启用' : '禁用'}
                  </Badge>
                </div>
              </div>
              {product?.description && (
                <div>
                  <span className="text-muted-foreground">描述:</span>
                  <p className="font-medium">{product.description}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">流程配置</h2>
            <FlowConfig productId={product!.id} flows={product?.flows || []} />
          </Card>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: 提交代码**

```bash
git add frontend/src
git commit -m "feat: implement product detail page with flow config"
```

**验证标准:**
- ✅ 产品详情展示完整
- ✅ 流程配置可保存

---

## 阶段二:合同收款模块 (1.5周)

### Task 4: 后端 - 合同管理 API

**目标:** 实现合同全生命周期管理

**主要功能:**
- 合同 CRUD 操作
- 合同状态流转(待收款→部分收款→已收全)
- 合同与客户、产品关联
- 合同服务周期管理
- 合同编号自动生成

**验证标准:**
- ✅ 合同状态流转正确
- ✅ 关联数据查询正常
- ✅ 服务周期计算准确

### Task 5: 后端 - 收款记录 API

**目标:** 实现收款记录管理

**主要功能:**
- 收款记录 CRUD
- 收款确认流程
- 收款凭证上传
- 合同收款统计
- 收款方式管理

**验证标准:**
- ✅ 收款记录与合同关联正确
- ✅ 收款统计准确
- ✅ 凭证上传功能正常

### Task 6: 前端 - 合同列表页面

**目标:** 实现响应式合同列表

**主要功能:**
- 合同列表(状态标签、金额显示)
- 筛选(客户、产品、状态、时间范围)
- 新建合同弹窗(关联客户和产品)
- 批量操作

**验证标准:**
- ✅ PC/移动端展示正常
- ✅ 状态标签颜色正确
- ✅ 筛选功能完整

### Task 7: 前端 - 合同详情页面

**目标:** 实现合同详情和收款管理

**主要功能:**
- 合同基础信息
- 服务周期展示
- 收款记录时间线
- 收款进度条
- 添加收款记录

**验证标准:**
- ✅ 详情展示完整
- ✅ 收款进度计算正确
- ✅ 收款记录时间线展示正常

---

## 阶段三:开票管理模块 (1周)

### Task 8: 后端 - 开票记录 API

**目标:** 实现开票记录和超额管理

**主要功能:**
- 开票记录 CRUD
- 月度开票统计
- 超额检测和计算
- 开票额度预警
- 客户开票汇总

**验证标准:**
- ✅ 开票额度计算准确
- ✅ 超额检测正确
- ✅ 月度统计无误差

### Task 9: 前端 - 开票管理页面

**目标:** 实现开票记录和超额管理界面

**主要功能:**
- 开票记录列表
- 月度开票统计卡片
- 超额记录高亮显示
- 批量开票
- 开票额度预警提示

**验证标准:**
- ✅ 统计数据准确
- ✅ 超额提示明显
- ✅ 批量开票功能正常

---

## 阶段四:自动化规则引擎 (2周)

### Task 10: 后端 - 规则引擎核心

**目标:** 实现事件驱动的规则引擎

**主要功能:**
- 触发器管理(DATA_ADD, DATA_UPDATE, TIME_CONDITION)
- 条件评估器(支持 AND/OR 逻辑树)
- 工作流执行器
- 规则匹配引擎
- 执行日志记录

**验证标准:**
- ✅ 规则触发准确
- ✅ 条件评估正确
- ✅ 工作流执行成功
- ✅ 日志记录完整

### Task 11: 前端 - 规则配置界面

**目标:** 实现可视化规则配置

**主要功能:**
- 触发器配置
- 条件树可视化编辑器
- 工作流配置
- 规则测试界面
- 执行日志查看

**验证标准:**
- ✅ 条件树编辑器易用
- ✅ 规则测试功能正常
- ✅ 日志展示清晰

---

## 阶段五:系统配置模块 (1周)

### Task 12: 后端 - 角色权限管理

**目标:** 完善 RBAC 权限系统

**主要功能:**
- 角色管理
- 权限管理
- 用户角色分配
- 权限验证中间件

**验证标准:**
- ✅ 权限验证准确
- ✅ 角色分配正常

### Task 13: 前端 - 系统配置页面

**目标:** 实现系统配置界面

**主要功能:**
- 角色权限配置
- 常用语管理
- 收款账号配置
- 系统参数设置

**验证标准:**
- ✅ 权限配置生效
- ✅ 常用语可正常使用

---

## 阶段六:数据统计和仪表板 (1周)

### Task 14: 后端 - 统计数据 API

**目标:** 实现统计数据接口

**主要功能:**
- 首页仪表板数据
- 业绩统计
- 客户分析
- 收款统计
- 开票统计

**验证标准:**
- ✅ 统计数据准确
- ✅ 查询性能良好(< 500ms)

### Task 15: 前端 - 数据统计页面

**目标:** 实现数据可视化

**主要功能:**
- 首页仪表板(关键指标卡片)
- 业绩趋势图(折线图)
- 客户分布图(饼图)
- 收款统计图(柱状图)
- 数据导出功能

**验证标准:**
- ✅ 图表展示正确
- ✅ 数据实时更新
- ✅ 导出功能正常

---

## 阶段七:测试和优化 (1周)

### Task 16: 单元测试

**目标:** 为核心业务逻辑编写单元测试

**范围:**
- 后端 Service 层测试
- 前端组件测试
- API 集成测试

### Task 17: 性能优化

**目标:** 优化应用性能

**内容:**
- 数据库查询优化
- 前端代码分割
- 图片懒加载
- API 缓存策略

### Task 18: 部署准备

**目标:** 准备生产环境部署

**内容:**
- Docker 配置
- 环境变量配置
- CI/CD 配置
- 部署文档

---

## 总体时间估算

- **阶段一(产品管理):** 1周
- **阶段二(合同收款):** 1.5周
- **阶段三(开票管理):** 1周
- **阶段四(自动化规则):** 2周
- **阶段五(系统配置):** 1周
- **阶段六(数据统计):** 1周
- **阶段七(测试优化):** 1周

**总计:** 约 8.5 周(2个月)

---

## 技术亮点

- 🚀 **现代化技术栈**: React 18 + Vite + Tailwind CSS + shadcn/ui
- 📱 **响应式设计**: PC/移动端共用代码,自动适配
- 🔐 **完整权限系统**: RBAC + JWT 认证
- ⚡ **高性能**: TanStack Query 缓存 + 代码分割
- 🎨 **优雅 UI**: shadcn/ui 组件库 + 暗黑模式支持
- 🔄 **自动化**: 事件驱动的规则引擎
- 📊 **数据可视化**: Recharts 图表库

---

**实施计划完成时间**: 预计 8.5 周
**技术难度**: 中等偏上
**推荐执行方式**: Subagent-Driven (分阶段逐步实施)
