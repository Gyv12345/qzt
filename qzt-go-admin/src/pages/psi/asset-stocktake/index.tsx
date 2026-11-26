import { useEffect, useRef, useState } from 'react'
import { App, Button, Progress, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProForm,
  ProFormDependency,
  ProFormRadio,
  ProFormSelect,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { listDepartments } from '../../../services/hrm'
import { createAssetStocktake, listAssetStocktakes } from '../../../services/psi'
import {
  ASSET_CATEGORY,
  ASSET_STOCKTAKE_SCOPES,
  ASSET_STOCKTAKE_STATUS,
  type PsiAssetStocktake,
} from '../../../types/psi'
import { pageIndexColumn } from '../../../components/IndexTag'
import AssetStocktakeDetailDrawer from './StocktakeDetailDrawer'

/** 资产盘点(P33):盘点单列表 + 新建(全部/按分类/按部门) + 详情(填报结果/完成盘点) */
export default function AssetStocktakePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [drawerId, setDrawerId] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  /** 部门下拉(id->名称),范围展示与选择共用 */
  const [depts, setDepts] = useState<{ label: string; value: number }[]>([])

  useEffect(() => {
    listDepartments().then((list) => {
      // /hrm/departments 实际返回 {list:[...]}(信封 data.list),兼容裸数组旧形状
      const rows = Array.isArray(list) ? list : (list as unknown as { list?: typeof list }).list || []
      setDepts(rows.map((d) => ({ label: d.name, value: d.id })))
    })
  }, [])

  const deptName = (v?: string | null) => depts.find((d) => d.value === Number(v))?.label

  const scopeText = (r: PsiAssetStocktake) => {
    const base = ASSET_STOCKTAKE_SCOPES[r.scope_type] || r.scope_type
    if (r.scope_type === 'all') return base
    if (r.scope_type === 'category') return `${base}·${r.scope_value}`
    return `${base}·${deptName(r.scope_value) ?? r.scope_value}`
  }

  const handleCreate = async (values: {
    scope_type: 'all' | 'category' | 'dept'
    scope_value?: string | number
    remark?: string
  }) => {
    await createAssetStocktake({
      scope_type: values.scope_type,
      scope_value: values.scope_type === 'all' ? undefined : values.scope_value,
      remark: values.remark || undefined,
    })
    message.success('盘点单已创建,已按范围冻结资产清单')
    actionRef.current?.reload()
    return true
  }

  const openDetail = (record: PsiAssetStocktake) => {
    setDrawerId(record.id)
    setDrawerOpen(true)
  }

  const columns: ProColumns<PsiAssetStocktake>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '盘点单号', dataIndex: 'stocktake_no', width: 180, search: false },
    {
      title: '范围',
      dataIndex: 'scope_type',
      width: 160,
      search: false,
      render: (_, r) => scopeText(r),
    },
    {
      title: '盘点进度',
      dataIndex: 'checked_count',
      width: 180,
      search: false,
      render: (_, r) => {
        const total = Number(r.total_count) || 0
        const checked = Number(r.checked_count) || 0
        const percent = total > 0 ? Math.round((checked / total) * 100) : 0
        return <Progress percent={percent} size="small" format={() => `${checked}/${total}`} />
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      fieldProps: {
        allowClear: true,
        placeholder: '选择状态',
        options: Object.entries(ASSET_STOCKTAKE_STATUS).map(([v, s]) => ({ label: s.text, value: Number(v) })),
      },
      render: (_, r) => {
        const s = ASSET_STOCKTAKE_STATUS[r.status]
        return s ? <Tag color={s.color}>{s.text}</Tag> : r.status
      },
    },
    { title: '盘点时间', dataIndex: 'stocktake_at', valueType: 'dateTime', width: 160, search: false },
    { title: '完成时间', dataIndex: 'finished_at', valueType: 'dateTime', width: 160, search: false },
    { title: '备注', dataIndex: 'remark', width: 160, search: false, ellipsis: true },
    {
      title: '操作',
      valueType: 'option',
      width: 90,
      fixed: 'right',
      render: (_, r) => (
        <Button type="link" size="small" onClick={() => openDetail(r)}>
          详情
        </Button>
      ),
    },
  ]

  return (
    <>
      <ProTable<PsiAssetStocktake>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listAssetStocktakes({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="psi:asset-stocktake:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建盘点
            </Button>
          </Auth>,
        ]}
        headerTitle="资产盘点"
      />

      <ModalForm<{
        scope_type: 'all' | 'category' | 'dept'
        scope_value?: string | number
        remark?: string
      }>
        title="新建盘点(创建即冻结范围内资产清单)"
        open={createOpen}
        onOpenChange={setCreateOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleCreate}
        width={520}
        grid
        initialValues={{ scope_type: 'all' }}
      >
        <ProFormRadio.Group
          name="scope_type"
          label="盘点范围"
          rules={[{ required: true, message: '请选择盘点范围' }]}
          options={Object.entries(ASSET_STOCKTAKE_SCOPES).map(([v, text]) => ({ label: text, value: v }))}
          colProps={{ span: 24 }}
        />
        <ProFormDependency name={['scope_type']}>
          {({ scope_type }) =>
            scope_type === 'category' ? (
              <ProFormSelect
                name="scope_value"
                label="资产分类"
                rules={[{ required: true, message: '请选择分类' }]}
                options={Object.keys(ASSET_CATEGORY).map((c) => ({ label: c, value: c }))}
                colProps={{ span: 24 }}
              />
            ) : scope_type === 'dept' ? (
              <ProFormSelect
                name="scope_value"
                label="所属部门"
                rules={[{ required: true, message: '请选择部门' }]}
                options={depts}
                fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
                colProps={{ span: 24 }}
              />
            ) : (
              <ProForm.Item noStyle />
            )
          }
        </ProFormDependency>
        <ProFormTextArea name="remark" label="备注" fieldProps={{ rows: 3 }} colProps={{ span: 24 }} />
      </ModalForm>

      <AssetStocktakeDetailDrawer
        open={drawerOpen}
        stocktakeId={drawerId}
        deptName={deptName}
        onClose={() => setDrawerOpen(false)}
        onChanged={() => actionRef.current?.reload()}
      />
    </>
  )
}
