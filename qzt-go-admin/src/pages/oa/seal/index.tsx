import { useEffect, useRef, useState } from 'react'
import { App, Button, Popconfirm, Select, Space, Tabs, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import ApprovalFlowSetup from '../../../components/ApprovalFlowSetup'
import {
  deleteSeal,
  deleteSealApplication,
  listSealApplications,
  listSeals,
  submitSealApplicationApproval,
} from '../../../services/oa'
import { listUserOptions } from '../../../services/system'
import {
  APPROVAL_STATUS_MAP,
  APPROVAL_STATUS_OPTIONS,
  canResubmitApproval,
  SEAL_STATUS_MAP,
  SEAL_STATUS_OPTIONS,
  SEAL_TYPE_MAP,
  SEAL_TYPE_OPTIONS,
  type OaSeal,
  type OaSealApplication,
} from '../../../types/oa'
import SealEditModal from './SealEditModal'
import SealApplicationEditModal from './ApplicationEditModal'
import { pageIndexColumn } from '../../../components/IndexTag'

/** 循环分页拉全量印章,供印章名映射与下拉选择用 */
const loadAllSeals = async (): Promise<OaSeal[]> => {
  const pageSize = 100
  const all: OaSeal[] = []
  let page = 1
  for (;;) {
    const res = await listSeals({ page, page_size: pageSize })
    all.push(...res.list)
    if (all.length >= res.total || res.list.length === 0) break
    page++
  }
  return all
}

export default function SealPage() {
  const { message } = App.useApp()
  const sealActionRef = useRef<ActionType>(null)
  const appActionRef = useRef<ActionType>(null)
  const [sealMap, setSealMap] = useState<Map<number, OaSeal>>(new Map())
  const [userMap, setUserMap] = useState<Map<number, string>>(new Map())
  const [sealOpen, setSealOpen] = useState(false)
  const [editingSealId, setEditingSealId] = useState<number | null>(null)
  const [appOpen, setAppOpen] = useState(false)
  const [editingAppId, setEditingAppId] = useState<number | null>(null)

  /** 加载印章台账与用户简表,构建 id→印章名 / id→昵称 映射 */
  const loadMaps = async () => {
    const [seals, users] = await Promise.all([loadAllSeals(), listUserOptions()])
    const sMap = new Map<number, OaSeal>()
    seals.forEach((s) => sMap.set(s.id, s))
    setSealMap(sMap)
    const uMap = new Map<number, string>()
    users.list.forEach((u) => uMap.set(u.id, u.nickname || u.username))
    setUserMap(uMap)
  }

  useEffect(() => {
    loadMaps().catch(() => {
      // 拦截器已提示
    })
  }, [])

  const handleDeleteSeal = async (id: number) => {
    await deleteSeal(id)
    message.success('已删除')
    await loadMaps()
    sealActionRef.current?.reload()
  }

  const handleSubmitApp = async (record: OaSealApplication) => {
    await submitSealApplicationApproval(record.id)
    message.success('已提交审批')
    appActionRef.current?.reload()
  }

  const handleDeleteApp = async (id: number) => {
    await deleteSealApplication(id)
    message.success('已删除')
    appActionRef.current?.reload()
  }

  // ---------- Tab1 印章台账 ----------
  const sealColumns: ProColumns<OaSeal>[] = [
    pageIndexColumn(sealActionRef, { width: 60 }),
    { title: '印章名称', dataIndex: 'name', width: 160 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      valueType: 'select',
      renderFormItem: () => <Select options={[...SEAL_TYPE_OPTIONS]} placeholder="全部" allowClear />,
      render: (_, r) => {
        const s = SEAL_TYPE_MAP[r.type] ?? { text: r.type, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '保管人',
      dataIndex: 'keeper_id',
      width: 100,
      search: false,
      render: (_, r) => (r.keeper_id ? userMap.get(r.keeper_id) ?? `#${r.keeper_id}` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      renderFormItem: () => <Select options={[...SEAL_STATUS_OPTIONS]} placeholder="全部" allowClear />,
      render: (_, r) => {
        const s = SEAL_STATUS_MAP[r.status]
        return s ? <Tag color={s.color}>{s.text}</Tag> : '-'
      },
    },
    { title: '备注', dataIndex: 'remark', width: 180, search: false, ellipsis: true },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="oa:seal:edit">
            <Button type="link" size="small" onClick={() => { setEditingSealId(record.id); setSealOpen(true) }}>编辑</Button>
          </Auth>
          <Auth perm="oa:seal:delete">
            <Popconfirm title="确认删除?" okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => handleDeleteSeal(record.id)}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  // ---------- Tab2 用印申请 ----------
  const appColumns: ProColumns<OaSealApplication>[] = [
    pageIndexColumn(appActionRef, { width: 60 }),
    { title: '单号', dataIndex: 'application_no', width: 150 },
    { title: '标题', dataIndex: 'title', width: 160, ellipsis: true },
    {
      title: '印章',
      dataIndex: 'seal_id',
      width: 130,
      search: false,
      render: (_, r) => sealMap.get(r.seal_id)?.name ?? `#${r.seal_id}`,
    },
    { title: '文件名称', dataIndex: 'document_name', width: 160, search: false, ellipsis: true },
    { title: '份数', dataIndex: 'copies', width: 70, search: false },
    { title: '用印日期', dataIndex: 'seal_date', width: 110, search: false, render: (_, r) => r.seal_date?.slice(0, 10) },
    { title: '事由', dataIndex: 'reason', width: 160, search: false, ellipsis: true },
    {
      title: '审批状态',
      dataIndex: 'approval_status',
      width: 100,
      valueType: 'select',
      renderFormItem: () => <Select options={[...APPROVAL_STATUS_OPTIONS]} placeholder="全部" allowClear />,
      render: (_, r) => {
        const s = APPROVAL_STATUS_MAP[r.approval_status] ?? APPROVAL_STATUS_MAP.NONE
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {canResubmitApproval(record.approval_status) && (
            <Popconfirm title="提交审批?" okText="提交" cancelText="取消" onConfirm={() => handleSubmitApp(record)}>
              <Button type="link" size="small">提交审批</Button>
            </Popconfirm>
          )}
          {canResubmitApproval(record.approval_status) && (
            <Auth perm="oa:seal:edit">
              <Button type="link" size="small" onClick={() => { setEditingAppId(record.id); setAppOpen(true) }}>编辑</Button>
            </Auth>
          )}
          {record.approval_status === 'NONE' && (
            <Auth perm="oa:seal:delete">
              <Popconfirm title="确认删除?" okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => handleDeleteApp(record.id)}>
                <Button type="link" size="small" danger>删除</Button>
              </Popconfirm>
            </Auth>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Tabs
        defaultActiveKey="seals"
        items={[
          {
            key: 'seals',
            label: '印章台账',
            children: (
              <ProTable<OaSeal>
                rowKey="id"
                actionRef={sealActionRef}
                columns={sealColumns}
                scroll={{ x: 'max-content' }}
                request={async (params) => {
                  const { current, pageSize, ...rest } = params
                  const data = await listSeals({ page: current || 1, page_size: pageSize || 10, ...rest })
                  return { data: data.list, total: data.total, success: true }
                }}
                toolBarRender={() => [
                  <Auth perm="oa:seal:add" key="add">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingSealId(null); setSealOpen(true) }}>新增印章</Button>
                  </Auth>,
                ]}
                headerTitle="印章台账"
              />
            ),
          },
          {
            key: 'applications',
            label: '用印申请',
            children: (
              <ProTable<OaSealApplication>
                rowKey="id"
                actionRef={appActionRef}
                columns={appColumns}
                scroll={{ x: 'max-content' }}
                request={async (params) => {
                  const { current, pageSize, ...rest } = params
                  const data = await listSealApplications({ page: current || 1, page_size: pageSize || 10, ...rest })
                  return { data: data.list, total: data.total, success: true }
                }}
                toolBarRender={() => [
                  <Auth perm="oa:seal:add" key="add">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingAppId(null); setAppOpen(true) }}>发起用印申请</Button>
                  </Auth>,
                ]}
                headerTitle={
                  <Space align="center">
                    <span>用印申请</span>
                    <ApprovalFlowSetup formType="SEAL" label="用印审批" />
                  </Space>
                }
              />
            ),
          },
        ]}
      />
      <SealEditModal open={sealOpen} editingId={editingSealId} onOpenChange={setSealOpen} onSuccess={async () => { await loadMaps(); sealActionRef.current?.reload() }} />
      <SealApplicationEditModal open={appOpen} editingId={editingAppId} onOpenChange={setAppOpen} onSuccess={() => appActionRef.current?.reload()} />
    </>
  )
}
