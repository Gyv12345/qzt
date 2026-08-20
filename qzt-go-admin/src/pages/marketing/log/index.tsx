import { useEffect, useRef, useState } from 'react'
import { App, Button, Descriptions, Drawer, Tag } from 'antd'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { getLog, listAccounts, listLogs, type LogQuery } from '../../../services/marketing'
import type { MarketingAccount, MarketingLeadLog } from '../../../types/marketing'
import { pageIndexColumn } from '../../../components/IndexTag'

const STATUS_ENUM = {
  1: { text: '已入库', status: 'Success' },
  2: { text: '重复跳过', status: 'Warning' },
  3: { text: '失败', status: 'Error' },
} as const

interface LogDetail {
  log: MarketingLeadLog
  raw: string
}

export default function MarketingLogPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [accounts, setAccounts] = useState<MarketingAccount[]>([])
  const [detail, setDetail] = useState<LogDetail | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // 账号下拉(筛选 + 列展示账号名)
  useEffect(() => {
    listAccounts()
      .then((res) => setAccounts(res.list))
      .catch(() => {})
  }, [])

  const accountName = (id: number) => accounts.find((a) => a.id === id)?.name ?? `账号${id}`

  const openDetail = async (record: MarketingLeadLog) => {
    try {
      const res = await getLog(record.id)
      setDetail(res)
      setDrawerOpen(true)
    } catch {
      message.error('加载详情失败')
    }
  }

  const columns: ProColumns<MarketingLeadLog>[] = [
    pageIndexColumn(actionRef, { title: '序号' }),
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '姓名 / 手机号' },
    },
    {
      title: '渠道账号',
      dataIndex: 'account_id',
      hideInTable: true,
      valueType: 'select',
      fieldProps: {
        options: accounts.map((a) => ({ label: a.name, value: a.id })),
        showSearch: true,
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      hideInTable: true,
      valueType: 'select',
      valueEnum: { 1: { text: '已入库' }, 2: { text: '重复跳过' }, 3: { text: '失败' } },
    },
    {
      title: '同步时间',
      dataIndex: 'date_range',
      hideInTable: true,
      valueType: 'dateRange',
      search: {
        transform: (value: [string, string]) => ({ start_time: value?.[0], end_time: value?.[1] }),
      },
    },
    // 可见列
    {
      title: '姓名',
      dataIndex: 'name',
      search: false,
      width: 110,
      render: (_, r) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openDetail(r)}>
          {r.name || '-'}
        </Button>
      ),
    },
    { title: '手机号', dataIndex: 'phone', search: false, width: 130 },
    { title: '公司', dataIndex: 'company', search: false, ellipsis: true },
    {
      title: '渠道账号',
      dataIndex: 'account_id',
      search: false,
      width: 120,
      render: (_, r) => accountName(r.account_id),
    },
    { title: '广告计划', dataIndex: 'campaign_name', search: false, ellipsis: true },
    { title: '广告', dataIndex: 'ad_name', search: false, ellipsis: true },
    {
      title: '留资时间',
      dataIndex: 'lead_create_time',
      search: false,
      width: 160,
      render: (_, r) => r.lead_create_time || '-',
    },
    { title: '状态', dataIndex: 'status', search: false, width: 100, valueEnum: STATUS_ENUM },
    {
      title: '说明',
      dataIndex: 'detail',
      search: false,
      ellipsis: true,
      render: (_, r) => r.detail || '-',
    },
    {
      title: '同步时间',
      dataIndex: 'created_at',
      search: false,
      valueType: 'dateTime',
      width: 160,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Auth perm="marketing:log:detail">
          <Button type="link" size="small" onClick={() => openDetail(record)}>
            详情
          </Button>
        </Auth>
      ),
    },
  ]

  return (
    <>
      <ProTable<MarketingLeadLog>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const res = await listLogs({ page: current, page_size: pageSize, ...(rest as LogQuery) })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        headerTitle="同步日志"
      />

      <Drawer
        title="线索同步详情"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
      >
        {detail && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="状态">
                <Tag color={detail.log.status === 1 ? 'green' : detail.log.status === 2 ? 'orange' : 'red'}>
                  {STATUS_ENUM[detail.log.status].text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="姓名">{detail.log.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="手机号">{detail.log.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="公司">{detail.log.company || '-'}</Descriptions.Item>
              <Descriptions.Item label="渠道账号">{accountName(detail.log.account_id)}</Descriptions.Item>
              <Descriptions.Item label="广告计划">{detail.log.campaign_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="广告">{detail.log.ad_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="留资时间">{detail.log.lead_create_time || '-'}</Descriptions.Item>
              <Descriptions.Item label="同步时间">{detail.log.created_at || '-'}</Descriptions.Item>
              {detail.log.detail && (
                <Descriptions.Item label="说明">{detail.log.detail}</Descriptions.Item>
              )}
            </Descriptions>
            <h4 style={{ margin: '16px 0 8px' }}>巨量返回的原始报文</h4>
            <pre
              style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 6,
                fontSize: 12,
                maxHeight: 320,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {detail.raw ? JSON.stringify(JSON.parse(detail.raw), null, 2) : '(无)'}
            </pre>
          </>
        )}
      </Drawer>
    </>
  )
}
