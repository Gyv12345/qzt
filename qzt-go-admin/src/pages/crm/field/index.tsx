import { useRef, useState } from 'react'
import {
  App,
  Button,
  Form,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ProForm,
  ModalForm,
  ProFormDigit,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import {
  createCustomField,
  deleteCustomField,
  listCustomFields,
  updateCustomField,
} from '../../../services/crm'
import { CRM_FORM_KEYS, CUSTOM_FIELD_TYPES, type CrmCustomField } from '../../../types/crm'

interface FieldFormValues {
  name: string
  internal_key?: string
  type: string
  prop?: string
  mobile: boolean
  pos?: number
}

const typeOptions = CUSTOM_FIELD_TYPES.map((t) => ({ label: t, value: t }))

export default function CrmFieldPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<FieldFormValues>()
  const [currentKey, setCurrentKey] = useState<string>(CRM_FORM_KEYS[0].value)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmCustomField | null>(null)

  const currentLabel = CRM_FORM_KEYS.find((f) => f.value === currentKey)?.label ?? currentKey

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: CrmCustomField) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      internal_key: record.internal_key || undefined,
      type: record.type,
      prop: record.prop || undefined,
      mobile: record.mobile === 1,
      pos: record.pos,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: FieldFormValues) => {
    const payload = {
      name: values.name,
      internal_key: values.internal_key || undefined,
      type: values.type,
      prop: values.prop || undefined,
      mobile: values.mobile ? 1 : 0,
      pos: values.pos,
    }
    if (editing) {
      await updateCustomField(editing.id, payload)
      message.success('字段已更新')
    } else {
      await createCustomField({ ...payload, form_key: currentKey })
      message.success('字段已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: CrmCustomField) => {
    await deleteCustomField(record.id)
    message.success('字段已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<CrmCustomField>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70 },
    { title: '字段名称', dataIndex: 'name', width: 160 },
    {
      title: '内部标识',
      dataIndex: 'internal_key',
      width: 140,
      render: (_, r) => r.internal_key || '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (_, r) => <Tag>{r.type}</Tag>,
    },
    { title: '排序', dataIndex: 'pos', width: 70 },
    {
      title: '移动端',
      dataIndex: 'mobile',
      width: 80,
      render: (_, r) => (r.mobile === 1 ? '是' : '否'),
    },
    {
      title: '可读',
      dataIndex: 'readable',
      width: 70,
      render: (_, r) => (r.readable === 1 ? '是' : '否'),
    },
    {
      title: '可编辑',
      dataIndex: 'editable',
      width: 70,
      render: (_, r) => (r.editable === 1 ? '是' : '否'),
    },
    {
      title: 'prop',
      dataIndex: 'prop',
      width: 220,
      render: (_, r) =>
        r.prop ? (
          <Typography.Paragraph
            ellipsis={{ tooltip: r.prop }}
            style={{ marginBottom: 0, maxWidth: 220 }}
          >
            {r.prop}
          </Typography.Paragraph>
        ) : (
          '-'
        ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="crm:field:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="crm:field:delete">
            <Popconfirm
              title="删除后已录入的该字段数据将不可见,确认删除?"
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Tabs
        activeKey={currentKey}
        onChange={(key) => setCurrentKey(key)}
        items={CRM_FORM_KEYS.map((f) => ({ key: f.value, label: f.label }))}
      />
      <ProTable<CrmCustomField>
        key={currentKey}
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        pagination={false}
        request={async () => {
          const data = await listCustomFields(currentKey)
          return { data, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="crm:field:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增字段
            </Button>
          </Auth>,
        ]}
        headerTitle={`${currentLabel}字段列表`}
      />
      <ModalForm<FieldFormValues>
        title={editing ? '编辑字段' : `新增${currentLabel}字段`}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <ProFormText
          name="name"
          label="字段名称"
          rules={[{ required: true, message: '请输入字段名称' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="internal_key"
          label="内部标识"
          placeholder="英文字段名,留空自动生成"
          colProps={{ span: 12 }}
        />
        <ProForm.Item
          name="type"
          label="字段类型"
          rules={[{ required: true, message: '请选择字段类型' }]}
          colProps={{ span: 12 }}
        >
          <Select options={typeOptions} placeholder="请选择字段类型" showSearch />
        </ProForm.Item>
        <ProForm.Item name="mobile" label="移动端" valuePropName="checked" colProps={{ span: 12 }}>
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </ProForm.Item>
        <ProFormTextArea
          name="prop"
          label="prop"
          placeholder='大属性 JSON,如 {"options":[{"label":"选项A","value":"A"}]},仅选项类字段需要'
          fieldProps={{ rows: 3 }}
          colProps={{ span: 24 }}
        />
        <ProFormDigit
          name="pos"
          label="排序"
          min={0}
          fieldProps={{ precision: 0 }}
          colProps={{ span: 12 }}
        />
      </ModalForm>
    </>
  )
}
