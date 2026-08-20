import { useEffect, useState } from 'react'
import { App, Col, Form, Select } from 'antd'
import { ModalForm, ProForm, ProFormText } from '@ant-design/pro-components'
import DedupAlert from '../../../components/DedupAlert'
import DictSelect from '../../../components/DictSelect'
import UserSelect from '../../../components/UserSelect'
import CustomFieldItem, { buildFieldValueMap, serializeFieldValues } from '../customer/CustomFields'
import { createLead, getLead, updateLead } from '../../../services/lead'
import { listCustomFields } from '../../../services/crm'
import type { CrmCustomField } from '../../../types/crm'
import type { CrmLead, CrmLeadPayload } from '../../../types/lead'

export interface LeadFormValues {
  name: string
  lead_no?: string
  contact_name?: string
  phone?: string
  email?: string
  company?: string
  level?: string
  source?: string
  industry?: string
  status?: number
  owner_id?: number
}

const STATUS_OPTIONS = [
  { label: '新建', value: 1 },
  { label: '跟进中', value: 2 },
  { label: '已转化', value: 3 },
  { label: '无效', value: 4 },
]

interface EditModalProps {
  open: boolean
  editing: CrmLead | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

/** 线索新增/编辑表单:基础字段 + LEAD 自定义字段 + 名称/电话查重提示 */
export default function LeadEditModal({ open, editing, onOpenChange, onSuccess }: EditModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<LeadFormValues>()
  // 表单内名称/电话(查重提示联动)
  const watchName = Form.useWatch('name', form)
  const watchPhone = Form.useWatch('phone', form)
  // 自定义字段定义与值(field_id -> value)
  const [customFields, setCustomFields] = useState<CrmCustomField[]>([])
  const [fieldValues, setFieldValues] = useState<Map<string, unknown>>(new Map())

  const ensureCustomFields = async () => {
    if (customFields.length) return customFields
    const defs = await listCustomFields('LEAD')
    setCustomFields(defs)
    return defs
  }

  // 弹窗打开即拉取字段定义(新增时 editing 为空,不走下方回填逻辑,也必须展示自定义字段);
  // 每次打开重新拉,保证配置页新增/删除的字段即时生效
  useEffect(() => {
    if (!open) return
    listCustomFields('LEAD')
      .then(setCustomFields)
      .catch(() => {})
  }, [open])

  // 打开编辑时拉详情(含自定义字段值)回填
  useEffect(() => {
    if (!open || !editing) return
    let cancelled = false
    ;(async () => {
      const defs = await ensureCustomFields()
      const detail = await getLead(editing.id)
      if (cancelled) return
      form.setFieldsValue({
        name: detail.lead.name,
        lead_no: detail.lead.lead_no || undefined,
        contact_name: detail.lead.contact_name || undefined,
        phone: detail.lead.phone || undefined,
        email: detail.lead.email || undefined,
        company: detail.lead.company || undefined,
        level: detail.lead.level || undefined,
        source: detail.lead.source || undefined,
        industry: detail.lead.industry || undefined,
        status: detail.lead.status,
      })
      setFieldValues(buildFieldValueMap(defs, detail.fields ?? {}))
    })().catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const handleOpenChange = (next: boolean) => {
    // 关闭时清空表单与自定义字段值,下次新增从空白开始
    if (!next) {
      setFieldValues(new Map())
      form.resetFields()
    }
    onOpenChange(next)
  }

  const handleSubmit = async (values: LeadFormValues) => {
    const payload: CrmLeadPayload = {
      name: values.name,
      lead_no: values.lead_no || undefined,
      contact_name: values.contact_name || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      company: values.company || undefined,
      level: values.level,
      source: values.source,
      industry: values.industry,
      fields: serializeFieldValues(fieldValues),
    }
    if (editing) {
      await updateLead(editing.id, { ...payload, status: values.status })
      message.success('线索已更新')
    } else {
      await createLead({ ...payload, owner_id: values.owner_id })
      message.success('线索已创建')
    }
    onSuccess()
    return true
  }

  return (
    <ModalForm<LeadFormValues>
      title={editing ? '编辑线索' : '新增线索'}
      form={form}
      open={open}
      onOpenChange={handleOpenChange}
      modalProps={{ destroyOnHidden: true, maskClosable: false }}
      onFinish={handleSubmit}
      width={640}
      grid
    >
      <Col span={24}>
        <DedupAlert
          name={watchName}
          phone={watchPhone}
          excludeType="LEAD"
          excludeId={editing?.id}
          excludeCustomerIds={editing?.converted_customer_id ? [editing.converted_customer_id] : undefined}
        />
      </Col>
      <ProFormText
        name="name"
        label="线索名称"
        rules={[{ required: true, message: '请输入线索名称' }]}
        colProps={{ span: 12 }}
      />
      <ProFormText name="lead_no" label="线索编号" placeholder="留空则自动生成" colProps={{ span: 12 }} />
      <ProFormText name="contact_name" label="联系人" colProps={{ span: 12 }} />
      <ProFormText name="phone" label="电话" colProps={{ span: 12 }} />
      <ProFormText name="email" label="邮箱" colProps={{ span: 12 }} />
      <ProFormText name="company" label="公司" colProps={{ span: 12 }} />
      <Col span={12}>
        <ProForm.Item name="level" label="级别">
          <DictSelect code="LEAD_LEVEL" placeholder="选择级别" />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="source" label="来源">
          <DictSelect code="LEAD_SOURCE" placeholder="选择来源" />
        </ProForm.Item>
      </Col>
      <Col span={12}>
        <ProForm.Item name="industry" label="行业">
          <DictSelect code="INDUSTRY" placeholder="选择行业" />
        </ProForm.Item>
      </Col>
      {editing && (
        <Col span={12}>
          <ProForm.Item name="status" label="状态">
            <Select options={STATUS_OPTIONS} placeholder="选择状态" />
          </ProForm.Item>
        </Col>
      )}
      {!editing && (
        <Col span={12}>
          <ProForm.Item name="owner_id" label="负责人">
            <UserSelect placeholder="选择负责人,留空则进公海" />
          </ProForm.Item>
        </Col>
      )}
      {customFields.map((f) => (
        <Col span={12} key={f.id}>
          <ProForm.Item label={f.name}>
            <CustomFieldItem
              field={f}
              value={fieldValues.get(f.id)}
              onChange={(v) => {
                const next = new Map(fieldValues)
                if (v === undefined || v === null || v === '') next.delete(f.id)
                else next.set(f.id, v)
                setFieldValues(next)
              }}
            />
          </ProForm.Item>
        </Col>
      ))}
    </ModalForm>
  )
}
