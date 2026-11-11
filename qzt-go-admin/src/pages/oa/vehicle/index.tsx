import { useEffect, useRef, useState } from 'react'
import { App, Button, Popconfirm, Select, Space, Tabs, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import ApprovalFlowSetup from '../../../components/ApprovalFlowSetup'
import {
  deleteVehicle,
  deleteVehicleApplication,
  listVehicleApplications,
  listVehicles,
  returnVehicleApplication,
  submitVehicleApplicationApproval,
} from '../../../services/oa'
import { listUserOptions } from '../../../services/system'
import {
  APPROVAL_STATUS_MAP,
  APPROVAL_STATUS_OPTIONS,
  canResubmitApproval,
  VEHICLE_APPLICATION_STATUS_MAP,
  VEHICLE_STATUS_MAP,
  VEHICLE_STATUS_OPTIONS,
  type OaVehicle,
  type OaVehicleApplication,
} from '../../../types/oa'
import VehicleEditModal from './VehicleEditModal'
import VehicleApplicationEditModal from './ApplicationEditModal'
import { pageIndexColumn } from '../../../components/IndexTag'

/** 循环分页拉全量车辆(后端 page_size 上限 100),供车牌映射与下拉选择用 */
const loadAllVehicles = async (): Promise<OaVehicle[]> => {
  const pageSize = 100
  const all: OaVehicle[] = []
  let page = 1
  for (;;) {
    const res = await listVehicles({ page, page_size: pageSize })
    all.push(...res.list)
    if (all.length >= res.total || res.list.length === 0) break
    page++
  }
  return all
}

export default function VehiclePage() {
  const { message } = App.useApp()
  const vehicleActionRef = useRef<ActionType>(null)
  const appActionRef = useRef<ActionType>(null)
  const [vehicleMap, setVehicleMap] = useState<Map<number, OaVehicle>>(new Map())
  const [userMap, setUserMap] = useState<Map<number, string>>(new Map())
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null)
  const [appOpen, setAppOpen] = useState(false)
  const [editingAppId, setEditingAppId] = useState<number | null>(null)

  /** 加载车辆台账与用户简表,构建 id→车牌 / id→昵称 映射 */
  const loadMaps = async () => {
    const [vehicles, users] = await Promise.all([loadAllVehicles(), listUserOptions()])
    const vMap = new Map<number, OaVehicle>()
    vehicles.forEach((v) => vMap.set(v.id, v))
    setVehicleMap(vMap)
    const uMap = new Map<number, string>()
    users.list.forEach((u) => uMap.set(u.id, u.nickname || u.username))
    setUserMap(uMap)
  }

  useEffect(() => {
    loadMaps().catch(() => {
      // 拦截器已提示
    })
  }, [])

  const handleDeleteVehicle = async (id: number) => {
    await deleteVehicle(id)
    message.success('已删除')
    await loadMaps()
    vehicleActionRef.current?.reload()
  }

  const handleSubmitApp = async (record: OaVehicleApplication) => {
    await submitVehicleApplicationApproval(record.id)
    message.success('已提交审批')
    appActionRef.current?.reload()
  }

  const handleReturn = async (record: OaVehicleApplication) => {
    await returnVehicleApplication(record.id)
    message.success('已归还')
    appActionRef.current?.reload()
  }

  const handleDeleteApp = async (id: number) => {
    await deleteVehicleApplication(id)
    message.success('已删除')
    appActionRef.current?.reload()
  }

  // ---------- Tab1 车辆台账 ----------
  const vehicleColumns: ProColumns<OaVehicle>[] = [
    pageIndexColumn(vehicleActionRef, { width: 60 }),
    { title: '车牌号', dataIndex: 'plate_no', width: 130 },
    { title: '车型', dataIndex: 'vehicle_model', width: 140, search: false, ellipsis: true },
    { title: '座位数', dataIndex: 'seats', width: 80, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      renderFormItem: () => <Select options={[...VEHICLE_STATUS_OPTIONS]} placeholder="全部" allowClear />,
      render: (_, r) => {
        const s = VEHICLE_STATUS_MAP[r.status] ?? { text: r.status, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '责任人',
      dataIndex: 'owner_id',
      width: 100,
      search: false,
      render: (_, r) => (r.owner_id ? userMap.get(r.owner_id) ?? `#${r.owner_id}` : '-'),
    },
    { title: '备注', dataIndex: 'remark', width: 180, search: false, ellipsis: true },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="oa:vehicle:edit">
            <Button type="link" size="small" onClick={() => { setEditingVehicleId(record.id); setVehicleOpen(true) }}>编辑</Button>
          </Auth>
          <Auth perm="oa:vehicle:delete">
            <Popconfirm title="确认删除?" okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => handleDeleteVehicle(record.id)}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  // ---------- Tab2 用车申请 ----------
  const appColumns: ProColumns<OaVehicleApplication>[] = [
    pageIndexColumn(appActionRef, { width: 60 }),
    { title: '单号', dataIndex: 'application_no', width: 150 },
    { title: '标题', dataIndex: 'title', width: 160, ellipsis: true },
    {
      title: '车辆',
      dataIndex: 'vehicle_id',
      width: 130,
      search: false,
      render: (_, r) => vehicleMap.get(r.vehicle_id)?.plate_no ?? `#${r.vehicle_id}`,
    },
    { title: '事由', dataIndex: 'reason', width: 160, search: false, ellipsis: true },
    { title: '出发时间', dataIndex: 'start_time', width: 150, search: false, render: (_, r) => r.start_time?.slice(0, 16) },
    { title: '归还时间', dataIndex: 'end_time', width: 150, search: false, render: (_, r) => r.end_time?.slice(0, 16) },
    { title: '随行人数', dataIndex: 'passengers', width: 90, search: false },
    { title: '目的地', dataIndex: 'destination', width: 110, search: false, ellipsis: true },
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
      title: '业务状态',
      dataIndex: 'status',
      width: 100,
      search: false,
      render: (_, r) => {
        const s = VEHICLE_APPLICATION_STATUS_MAP[r.status]
        return s ? <Tag color={s.color}>{s.text}</Tag> : '-'
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {canResubmitApproval(record.approval_status) && (
            <Popconfirm title="提交审批?" okText="提交" cancelText="取消" onConfirm={() => handleSubmitApp(record)}>
              <Button type="link" size="small">提交审批</Button>
            </Popconfirm>
          )}
          {canResubmitApproval(record.approval_status) && (
            <Auth perm="oa:vehicle:edit">
              <Button type="link" size="small" onClick={() => { setEditingAppId(record.id); setAppOpen(true) }}>编辑</Button>
            </Auth>
          )}
          {record.approval_status === 'APPROVED' && record.status === 1 && (
            <Auth perm="oa:vehicle:return">
              <Popconfirm title="确认归还该车辆?" okText="归还" cancelText="取消" onConfirm={() => handleReturn(record)}>
                <Button type="link" size="small">归还</Button>
              </Popconfirm>
            </Auth>
          )}
          {record.approval_status === 'NONE' && (
            <Auth perm="oa:vehicle:delete">
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
        defaultActiveKey="vehicles"
        items={[
          {
            key: 'vehicles',
            label: '车辆台账',
            children: (
              <ProTable<OaVehicle>
                rowKey="id"
                actionRef={vehicleActionRef}
                columns={vehicleColumns}
                scroll={{ x: 'max-content' }}
                request={async (params) => {
                  const { current, pageSize, ...rest } = params
                  const data = await listVehicles({ page: current || 1, page_size: pageSize || 10, ...rest })
                  return { data: data.list, total: data.total, success: true }
                }}
                toolBarRender={() => [
                  <Auth perm="oa:vehicle:add" key="add">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingVehicleId(null); setVehicleOpen(true) }}>新增车辆</Button>
                  </Auth>,
                ]}
                headerTitle="车辆台账"
              />
            ),
          },
          {
            key: 'applications',
            label: '用车申请',
            children: (
              <ProTable<OaVehicleApplication>
                rowKey="id"
                actionRef={appActionRef}
                columns={appColumns}
                scroll={{ x: 'max-content' }}
                request={async (params) => {
                  const { current, pageSize, ...rest } = params
                  const data = await listVehicleApplications({ page: current || 1, page_size: pageSize || 10, ...rest })
                  return { data: data.list, total: data.total, success: true }
                }}
                toolBarRender={() => [
                  <Auth perm="oa:vehicle:add" key="add">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingAppId(null); setAppOpen(true) }}>发起用车申请</Button>
                  </Auth>,
                ]}
                headerTitle={
                  <Space align="center">
                    <span>用车申请</span>
                    <ApprovalFlowSetup formType="VEHICLE" label="用车审批" />
                  </Space>
                }
              />
            ),
          },
        ]}
      />
      <VehicleEditModal open={vehicleOpen} editingId={editingVehicleId} onOpenChange={setVehicleOpen} onSuccess={async () => { await loadMaps(); vehicleActionRef.current?.reload() }} />
      <VehicleApplicationEditModal open={appOpen} editingId={editingAppId} onOpenChange={setAppOpen} onSuccess={() => appActionRef.current?.reload()} />
    </>
  )
}
