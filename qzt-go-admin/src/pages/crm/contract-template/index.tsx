import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
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
  getContractTemplate,
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

  // 按分组排列变量
  const groupedVars = variables.reduce<Record<string, ContractVariable[]>>((acc, v) => {
    if (!acc[v.group]) acc[v.group] = []
    acc[v.group].push(v)
    return acc
  }, {})

  // 点击变量:在 content 末尾追加 ${key}(简单高效)
  const insertVariable = (key: string) => {
    setContent((c) => `${c}\${${key}}`)
  }

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
    setContent('')
    setOpen(true)
    // 列表接口不含 content 正文,需单独拉详情回填编辑器
    try {
      const detail = await getContractTemplate(record.id)
      setContent(detail.content || '')
    } catch {
      message.error('加载模板内容失败')
    }
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
              title="确认删除该模板?"
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
        width={1100}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true }}
        grid
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

        {/* 左栏变量面板 + 右栏编辑器 */}
        <div style={{ display: 'flex', gap: 16, width: '100%' }}>
          {/* 左栏:变量面板 */}
          <div style={{ width: 220, flexShrink: 0, maxHeight: 460, overflowY: 'auto', borderRight: '1px solid #f0f0f0', paddingRight: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#666' }}>📝 点击插入变量</div>
            {Object.entries(groupedVars).map(([group, vars]) => (
              <div key={group} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#999', marginBottom: 4 }}>{group}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {vars.map((v) => (
                    <Tag
                      key={v.key}
                      style={{ cursor: 'pointer', margin: '2px 0', fontSize: 12 }}
                      color="blue"
                      onClick={() => insertVariable(v.key)}
                    >
                      {v.label}
                    </Tag>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 右栏:编辑器 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <ProForm.Item
              label="模板正文(Markdown)"
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
                height={400}
                placeholder="支持 Markdown 语法,点击左侧变量插入占位符,如 ${customerName} ${productTable}"
              />
            </ProForm.Item>
          </div>
        </div>

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
