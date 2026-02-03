import { useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { ContractTable } from '@/components/common/ContractTable'
import { ContractCard } from '@/components/common/ContractCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useContracts } from '@/services'
import ContractModal from '@/components/common/ContractModal'

export default function ContractListPage() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalVisible, setModalVisible] = useState(false)
  const [currentContract, setCurrentContract] = useState<any>(null)

  const { data, isLoading, error, refetch } = useContracts({
    page,
    pageSize: isMobile ? 20 : 10,
    keyword: search || undefined,
  })

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
          <h1 className="text-3xl font-bold">合同管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {data?.total || 0} 个合同
          </p>
        </div>
        <Button onClick={() => { setCurrentContract(null); setModalVisible(true) }}>
          新建合同
        </Button>
      </div>

      <div>
        <Input
          placeholder="搜索合同编号、客户名称..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-md"
        />
      </div>

      {isMobile ? (
        <div className="grid gap-4 pb-16">
          {data?.data?.map((contract) => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
        </div>
      ) : (
        <ContractTable
          contracts={data?.data || []}
          total={data?.total || 0}
          page={page}
          pageSize={10}
          onPageChange={setPage}
        />
      )}

      {data?.data && data.data.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {search ? '没有找到匹配的合同' : '暂无合同,点击上方按钮创建第一个合同'}
          </div>
        </div>
      )}

      <ContractModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setCurrentContract(null)
        }}
        onSuccess={() => {
          setModalVisible(false)
          setCurrentContract(null)
          refetch()
        }}
        currentContract={currentContract}
      />
    </div>
  )
}
