import { useEffect, useState } from 'react'
import { App, Button, Card, InputNumber, Select, Space, Switch, Table, Tag, Typography } from 'antd'
import Auth from '../../../components/Auth'
import { listConfigs, batchUpdateConfigs } from '../../../services/system'
import type { SysConfig } from '../../../types'

/** 编号模块定义(与后端 numbergen.Register 对应) */
const MODULES = [
  { key: 'customer', name: '客户', defaultPrefix: 'KH' },
  { key: 'lead', name: '线索', defaultPrefix: 'X' },
  { key: 'contract', name: '合同', defaultPrefix: 'HT' },
  { key: 'opportunity', name: '商机', defaultPrefix: 'SJ' },
  { key: 'product', name: '产品', defaultPrefix: 'CP' },
  { key: 'contact', name: '联系人', defaultPrefix: 'LXR' },
  { key: 'follow', name: '跟进记录', defaultPrefix: 'GJ' },
  { key: 'leave', name: '请假', defaultPrefix: 'QJ' },
  { key: 'overtime', name: '加班', defaultPrefix: 'JB' },
  { key: 'supplier', name: '供应商', defaultPrefix: 'GYS' },
]

interface NumberRow {
  module: string
  name: string
  enabled: boolean
  prefix: string
  dateFormat: string
  seqWidth: number
  /** 预览:当前配置生成的编号示例 */
  preview: string
}

/** 日期格式选项 */
const DATE_FORMATS = [
  { label: '年月日 (20260806)', value: 'YYYYMMDD' },
  { label: '年月 (202608)', value: 'YYYYMM' },
  { label: '无日期', value: '' },
]

export default function NumberConfigPage() {
  const { message } = App.useApp()
  const [rows, setRows] = useState<NumberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  /** 暂存的改动: key → value */
  const [changes, setChanges] = useState<Record<string, string>>({})
  /** 原始配置(用于判断有没有改动) */
  const [original, setOriginal] = useState<Record<string, string>>({})

  const loadConfigs = async () => {
    setLoading(true)
    try {
      const configs = await listConfigs('number')
      const map: Record<string, string> = {}
      configs.forEach((c: SysConfig) => {
        map[c.key] = c.value
      })
      setOriginal(map)
      setChanges({})

      const today = new Date()
      const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
      const ym = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`

      const data: NumberRow[] = MODULES.map((m) => {
        const enabled = map[`number.${m.key}.enabled`] !== 'false'
        const prefix = map[`number.${m.key}.prefix`] || m.defaultPrefix
        const dateFormat = map[`number.${m.key}.date_format`] ?? 'YYYYMMDD'
        const seqWidth = parseInt(map[`number.${m.key}.seq_width`]) || 3
        const datePart = dateFormat === 'YYYYMMDD' ? ymd : dateFormat === 'YYYYMM' ? ym : ''
        const seqStr = String(1).padStart(seqWidth, '0')
        return {
          module: m.key,
          name: m.name,
          enabled,
          prefix,
          dateFormat,
          seqWidth,
          preview: `${prefix}${datePart}${seqStr}`,
        }
      })
      setRows(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfigs()
  }, [])

  const updateField = (module: string, field: string, value: string | number | boolean) => {
    const key = `number.${module}.${field}`
    const strVal = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)
    setChanges((prev) => ({ ...prev, [key]: strVal }))
    // 更新预览
    setRows((prev) =>
      prev.map((r) => {
        if (r.module !== module) return r
        const next = { ...r }
        if (field === 'enabled') next.enabled = value as boolean
        else if (field === 'prefix') next.prefix = value as string
        else if (field === 'date_format') next.dateFormat = value as string
        else if (field === 'seq_width') next.seqWidth = value as number
        // 重算预览
        const today = new Date()
        const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
        const ym = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`
        const datePart = next.dateFormat === 'YYYYMMDD' ? ymd : next.dateFormat === 'YYYYMM' ? ym : ''
        next.preview = `${next.prefix}${datePart}${String(1).padStart(next.seqWidth, '0')}`
        return next
      }),
    )
  }

  const handleSave = async () => {
    const keys = Object.keys(changes)
    if (keys.length === 0) {
      message.info('没有需要保存的修改')
      return
    }
    setSaving(true)
    try {
      // 只提交有变化的项
      const updates = keys
        .filter((k) => changes[k] !== (original[k] ?? ''))
        .map((key) => ({ key, value: changes[key] }))
      if (updates.length === 0) {
        message.info('没有需要保存的修改')
        return
      }
      await batchUpdateConfigs(updates)
      message.success(`编号设置已保存(${updates.length} 项)`)
      await loadConfigs()
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: '业务',
      dataIndex: 'name',
      width: 100,
      render: (name: string, r: NumberRow) => (
        <Space>
          <span>{name}</span>
          {!r.enabled && <Tag>已停用</Tag>}
        </Space>
      ),
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 70,
      render: (enabled: boolean, r: NumberRow) => (
        <Switch
          size="small"
          checked={enabled}
          onChange={(v) => updateField(r.module, 'enabled', v)}
        />
      ),
    },
    {
      title: '前缀',
      dataIndex: 'prefix',
      width: 100,
      render: (prefix: string, r: NumberRow) => (
        <input
          className="ant-input css-1dylfoh"
          style={{ width: 80 }}
          value={prefix}
          onChange={(e) => updateField(r.module, 'prefix', e.target.value)}
        />
      ),
    },
    {
      title: '日期格式',
      dataIndex: 'dateFormat',
      width: 180,
      render: (df: string, r: NumberRow) => (
        <Select
          size="small"
          style={{ width: 160 }}
          value={df}
          options={DATE_FORMATS}
          onChange={(v) => updateField(r.module, 'date_format', v)}
        />
      ),
    },
    {
      title: '序号位数',
      dataIndex: 'seqWidth',
      width: 100,
      render: (sw: number, r: NumberRow) => (
        <InputNumber
          size="small"
          min={1}
          max={6}
          style={{ width: 70 }}
          value={sw}
          onChange={(v) => updateField(r.module, 'seq_width', v || 3)}
        />
      ),
    },
    {
      title: '编号示例',
      dataIndex: 'preview',
      width: 160,
      render: (preview: string) => (
        <Typography.Text code copyable>
          {preview}
        </Typography.Text>
      ),
    },
  ]

  return (
    <Card
      title="业务编号设置"
      extra={
        <Space>
          <Button onClick={loadConfigs} disabled={loading || saving}>
            重置
          </Button>
          <Auth perm="system:config:edit">
            <Button type="primary" loading={saving} onClick={handleSave} disabled={Object.keys(changes).length === 0}>
              保存修改{Object.keys(changes).length > 0 ? `(${Object.keys(changes).length})` : ''}
            </Button>
          </Auth>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        配置各业务模块的自动编号规则。编号格式 = 前缀 + 日期 + 序号(补零)。保存后立即生效。
      </Typography.Paragraph>
      <Table<NumberRow>
        rowKey="module"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={false}
        size="middle"
      />
    </Card>
  )
}
