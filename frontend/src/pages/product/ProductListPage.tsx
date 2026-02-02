import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProducts, deleteProduct, createProduct, updateProduct, type Product, type CreateProductDto } from '@/services/product'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react'

export const ProductListPage = () => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    price: '',
    invoiceLimit: '',
    invoiceCount: '',
    overLimitPrice: '',
    status: 1,
  })
  const pageSize = 10

  // 获取产品列表
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', page, searchTerm, statusFilter],
    queryFn: () =>
      getProducts({
        page: page - 1,
        pageSize,
        keyword: searchTerm || undefined,
        status: statusFilter,
      }),
  })

  const products = data?.data || []
  const total = data?.total || 0

  // 删除产品
  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // 创建产品
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setDialogOpen(false)
      resetForm()
    },
  })

  // 更新产品
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setDialogOpen(false)
      resetForm()
    },
  })

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      code: product.code,
      description: product.description || '',
      price: String(product.price),
      invoiceLimit: String(product.invoiceLimit),
      invoiceCount: String(product.invoiceCount),
      overLimitPrice: String(product.overLimitPrice),
      status: product.status,
    })
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个产品吗?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCreate = () => {
    setEditingProduct(null)
    resetForm()
    setDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      price: '',
      invoiceLimit: '',
      invoiceCount: '',
      overLimitPrice: '',
      status: 1,
    })
  }

  const handleSubmit = () => {
    // 验证必填字段
    if (!formData.name.trim()) {
      alert('请输入产品名称')
      return
    }
    if (!formData.code.trim()) {
      alert('请输入产品代码')
      return
    }
    if (!formData.price || Number(formData.price) < 0) {
      alert('请输入有效的价格')
      return
    }

    // 构建产品数据
    const productData: CreateProductDto = {
      name: formData.name,
      code: formData.code,
      description: formData.description || undefined,
      price: Number(formData.price),
      invoiceLimit: formData.invoiceLimit ? Number(formData.invoiceLimit) : 0,
      invoiceCount: formData.invoiceCount ? Number(formData.invoiceCount) : 0,
      overLimitPrice: formData.overLimitPrice ? Number(formData.overLimitPrice) : 0,
      status: formData.status,
    }

    // 根据是否编辑选择调用
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: productData })
    } else {
      createMutation.mutate(productData)
    }
  }

  const getStatusTag = (status: number) => {
    return status === 1 ? (
      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">启用</span>
    ) : (
      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">禁用</span>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">产品管理</h1>
          <p className="text-sm text-gray-500 mt-1">共 {total} 个产品</p>
        </div>
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="w-4 h-4" />
          新建产品
        </Button>
      </div>

      {/* 搜索和筛选栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="search"
                placeholder="搜索产品名称、代码..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter !== undefined ? String(statusFilter) : 'all'}
              onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : Number(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="1">启用</SelectItem>
                <SelectItem value="0">禁用</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 产品列表 */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">加载中...</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-red-500">加载失败，请重试</CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">暂无产品数据</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{product.name}</h3>
                        {getStatusTag(product.status)}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        代码: {product.code} | 价格: ¥{product.price.toLocaleString()}
                      </p>
                      {product.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">{product.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>开票额度: {product.invoiceLimit}张/月</span>
                        <span>套餐张数: {product.invoiceCount}张</span>
                        <span>超额单价: ¥{product.overLimitPrice}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 分页 */}
      {total > pageSize && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一页
          </Button>
          <div className="flex items-center px-3 text-sm text-gray-600">
            第 {page} 页，共 {Math.ceil(total / pageSize)} 页
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / pageSize)}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 创建/编辑产品弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? '编辑产品' : '新建产品'}</DialogTitle>
            <DialogDescription>填写产品信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">产品名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入产品名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">产品代码 *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="例如: QZT-BASIC"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">产品描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入产品描述"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">产品价格 *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="请输入价格"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">状态</Label>
                <Select
                  value={String(formData.status)}
                  onValueChange={(v) => setFormData({ ...formData, status: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">启用</SelectItem>
                    <SelectItem value="0">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceLimit">开票额度(张/月)</Label>
                <Input
                  id="invoiceLimit"
                  type="number"
                  value={formData.invoiceLimit}
                  onChange={(e) => setFormData({ ...formData, invoiceLimit: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceCount">套餐张数</Label>
                <Input
                  id="invoiceCount"
                  type="number"
                  value={formData.invoiceCount}
                  onChange={(e) => setFormData({ ...formData, invoiceCount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overLimitPrice">超额单价</Label>
                <Input
                  id="overLimitPrice"
                  type="number"
                  value={formData.overLimitPrice}
                  onChange={(e) => setFormData({ ...formData, overLimitPrice: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
