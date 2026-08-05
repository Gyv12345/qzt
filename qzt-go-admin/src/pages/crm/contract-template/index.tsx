import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Select, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ProForm,
  ModalForm,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import MarkdownEditor from '../../../components/MarkdownEditor'
import {
  createContractTemplate,
  deleteContractTemplate,
  listContractTemplates,
  listContractVariables,
  updateContractTemplate,
} from '../../../services/crm'
import type {
  ContractVariable,
  CrmContractTemplate,
  CrmContractTemplatePayload,
} from '../../../types/crm'

interface TemplateFormValues {
  name: string
  content: string
  remark?: string
  enabled: boolean
}

export default function ContractTemplatePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CrmContractTemplate | null>(null)
  const [content, setContent] = useState('')
  const [variables, setVariables] = useState<ContractVariable[]>([])

  // 懒加载变量清单(首次打开表单时)
  const ensureVariables = () => {
    if (variables.length === 0) {
      listContractVariables().then(setVariables).catch(() => {})
    }
  }

  const openCreate = () => {
    ensureVariables()
    setEditing(null)
    setContent('')
    setOpen(true)
  }

  const openEdit = async (record: CrmContractTemplate) => {
    ensureVariables()
    setEditing(record)
    setContent(record.content)
    setOpen(true)
  }

  const handleSubmit = async (values: TemplateFormValues) => {
    const payload: CrmContractTemplatePayload = {
      name: values.name,
      content,
      remark: values.remark,
      enabled: values.enabled ? 1 : 0,
    }
    try {
      if (editing) {
        await updateContractTemplate(editing.id, payload)
        message.success('修改成功')
      } else {
        await createContractTemplate(payload)
        message.success('新增成功')
      }
      setOpen(false)
      actionRef.current?.reload()
      return true
    } catch {
      return false
    }
  }

  const columns: ProColumns<CrmContractTemplate>[] = [
    { title: 'ID', dataIndex: 'id', width: 60, search: false },
    { title: '模板名称', dataIndex: 'name', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 90,
      valueType: 'select',
      valueEnum: { 1: { text: '启用' }, 0: { text: '停用' } },
      render: (_, r) => (r.enabled === 1 ? '启用' : '停用'),
    },
    { title: '说明', dataIndex: 'remark', ellipsis: true, search: false },
    { title: '创建时间', dataIndex: 'created_at', width: 170, search: false },
    {
      title: '操作',
      width: 150,
      search: false,
      render: (_, r) => (
        <Space>
          <Auth perm="crm:contractTemplate:edit">
            <a onClick={() => openEdit(r)}>编辑</a>
          </Auth>
          <Auth perm="crm:contractTemplate:delete">
            <Popconfirm
              title="确认删除该模板？"
              onConfirm={async () => {
                await deleteContractTemplate(r.id)
                message.success('删除成功')
                actionRef.current?.reload()
              }}
            >
              <a>删除</a>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<CrmContractTemplate>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, name, enabled } = params
          const res = await listContractTemplates({
            page: current,
            page_size: pageSize,
            keyword: name as string | undefined,
            enabled: enabled !== undefined ? Number(enabled) : undefined,
          })
          return { data: res.list, total: res.total, success: true }
        }}
        toolBarRender={() => [
          <Auth key="add" perm="crm:contractTemplate:add">
            <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增模板
            </Button>
          </Auth>,
        ]}
      />

      <ModalForm<TemplateFormValues>
        title={editing ? '编辑模板' : '新增模板'}
        open={open}
        onOpenChange={setOpen}
        initialValues={
          editing
            ? { name: editing.name, remark: editing.remark, enabled: editing.enabled === 1 }
            : { enabled: true }
        }
        width={920}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true }}
      >
        <ProFormText
          name="name"
          label="模板名称"
          rules={[{ required: true, message: '请输入模板名称' }]}
          colProps={{ span: 12 }}
        />
        <ProForm.Item label="启用" name="enabled" valuePropName="checked" colProps={{ span: 6 }}>
          <ProFormSwitch />
        </ProForm.Item>
        <ProForm.Item label="插入变量" colProps={{ span: 24 }}>
          <Select
            placeholder="选择变量插入到正文 ${...}"
            showSearch
            optionFilterProp="label"
            options={variables.map((v) => ({ label: `${v.group} · ${v.label}（${v.key}）`, value: v.key }))}
            value={undefined}
            onChange={(key) => {
              if (key) {
                setContent((c) => `${c}\${${key}}`)
              }
            }}
            allowClear
          />
        </ProForm.Item>
        <ProForm.Item
          label="模板正文（Markdown）"
          required
          rules={[
            {
              validator: () => (content.trim() ? Promise.resolve() : Promise.reject(new Error('请输入模板正文'))),
            },
          ]}
          colProps={{ span: 24 }}
        >
          <MarkdownEditor
            value={content}
            onChange={setContent}
            height={420}
            placeholder="支持 Markdown 语法,可用 ${变量} 占位符,例如：甲方：${customerName}，合同编号：${contractNo}"
          />
        </ProForm.Item>
        <ProFormTextArea
          name="remark"
          label="说明"
          fieldProps={{ rows: 2 }}
          placeholder="模板用途说明"
          colProps={{ span: 24 }}
        />
      </ModalForm>
    </>
  )
}
