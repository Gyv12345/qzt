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

  const handleEdit = (product: any) => {
    setCurrentProduct(product)
    setModalVisible(true)
  }

  const handleCreate = () => {
    setCurrentProduct(null)
    setModalVisible(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">加载中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-red-500">
          <div className="text-lg">加载失败</div>
          <div className="text-sm mt-2">请检查网络连接或刷新页面重试</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">产品管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {data?.total || 0} 个产品
          </p>
        </div>
        <Button onClick={handleCreate}>
          新建产品
        </Button>
      </div>

      <div>
        <Input
          placeholder="搜索产品名称、代码..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1) // 搜索时重置页码
          }}
          className="max-w-md"
        />
      </div>

      {isMobile ? (
        <div className="grid gap-4 pb-16">
          {data?.data?.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <ProductTable
          products={data?.data || []}
          total={data?.total || 0}
          page={page}
          pageSize={10}
          onPageChange={setPage}
          onEdit={handleEdit}
        />
      )}

      {data?.data && data.data.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {search ? '没有找到匹配的产品' : '暂无产品,点击上方按钮创建第一个产品'}
          </div>
        </div>
      )}

      <ProductModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setCurrentProduct(null)
        }}
        onSuccess={() => {
          setModalVisible(false)
          setCurrentProduct(null)
          refetch()
        }}
        currentProduct={currentProduct}
      />
    </div>
  )
}
