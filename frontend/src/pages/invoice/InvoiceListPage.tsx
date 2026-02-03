import { useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { InvoiceTable } from '@/components/common/InvoiceTable'
import { InvoiceCard } from '@/components/common/InvoiceCard'
import { InvoiceStatsCard } from '@/components/common/InvoiceStatsCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import InvoiceModal from '@/components/common/InvoiceModal'
import { useInvoices, useCustomers } from '@/services'

export default function InvoiceListPage() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [search, setSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>()
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [modalVisible, setModalVisible] = useState(false)
  const [currentInvoice, setCurrentInvoice] = useState<any>(null)

  const { data, isLoading, error, refetch } = useInvoices({
    page,
    pageSize: isMobile ? 20 : 10,
    customerId: selectedCustomerId,
    month: selectedMonth,
  })

  const { data: customers } = useCustomers({ pageSize: 1000 })

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>加载失败</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">开票管理</h1>
        <Button onClick={() => { setCurrentInvoice(null); setModalVisible(true) }}>
          新建开票记录
        </Button>
      </div>

      {/* 月度统计卡片 */}
      <InvoiceStatsCard customerId={selectedCustomerId} month={selectedMonth} />

      {/* 筛选器 */}
      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="搜索客户名称"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <select
          value={selectedCustomerId || ''}
          onChange={(e) => setSelectedCustomerId(e.target.value || undefined)}
          className="border rounded px-3 py-2"
        >
          <option value="">所有客户</option>
          {customers?.data?.map((customer: any) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
        <Input
          type="month"
          value={selectedMonth || ''}
          onChange={(e) => setSelectedMonth(e.target.value || undefined)}
          className="max-w-[200px]"
        />
      </div>

      {/* 开票记录列表 */}
      {isMobile ? (
        <div className="grid gap-4">
          {data?.data?.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      ) : (
        <InvoiceTable
          invoices={data?.data || []}
          total={data?.total || 0}
          page={page}
          onPageChange={setPage}
          onEdit={(invoice) => { setCurrentInvoice(invoice); setModalVisible(true) }}
        />
      )}

      <InvoiceModal
        visible={modalVisible}
        onCancel={() => { setModalVisible(false); setCurrentInvoice(null) }}
        onSuccess={() => { setModalVisible(false); setCurrentInvoice(null); refetch() }}
        currentInvoice={currentInvoice}
      />
    </div>
  )
}
