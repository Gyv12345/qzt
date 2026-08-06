import { useRef, useState } from 'react'
import { App, Button, Col, Form, Popconfirm, Space, TreeSelect } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ProForm,
  ModalForm,
  ProFormDigit,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import {
  createCategory,
  deleteCategory,
  getCategoryTree,
  updateCategory,
} from '../../../services/cms'
import type { CmsCategory, CmsCategoryPayload } from '../../../types/cms'

interface CategoryFormValues {
  parent_id?: number
  name: string
  slug?: string
  sort: number
  status: number
  remark?: string
}

interface CategoryTreeNode {
  title: string
  value: number
  children?: CategoryTreeNode[]
}

const toTreeData = (categories: CmsCategory[]): CategoryTreeNode[] =>
  categories.map((c) => ({
    title: c.name,
    value: c.id,
    children: c.children?.length ? toTreeData(c.children) : undefined,
  }))

/** 记录每个分类的层级(顶级为 1),用于控制"新增子分类"只对一级、二级开放 */
const collectDepth = (categories: CmsCategory[], depth: number, map: Map<number, number>) => {
  categories.forEach((c) => {
    map.set(c.id, depth)
    if (c.children?.length) collectDepth(c.children, depth + 1, map)
  })
}

export default function CmsCategoryPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<CategoryFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CmsCategory | null>(null)
  const [treeData, setTreeData] = useState<CategoryTreeNode[]>([])
  const depthMap = useRef<Map<number, number>>(new Map())

  const loadTree = async () => {
    const tree = await getCategoryTree()
    setTreeData(toTreeData(tree))
    const map = new Map<number, number>()
    collectDepth(tree, 1, map)
    depthMap.current = map
  }

  const openCreate = (parent?: CmsCategory) => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      parent_id: parent?.id,
      sort: 0,
      status: 1,
    })
    setModalOpen(true)
  }

  const openEdit = (record: CmsCategory) => {
    setEditing(record)
    form.setFieldsValue({
      parent_id: record.parent_id === 0 ? undefined : record.parent_id,
      name: record.name,
      slug: record.slug || undefined,
      sort: record.sort,
      status: record.status,
      remark: record.remark || undefined,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: CategoryFormValues) => {
    const payload: CmsCategoryPayload = {
      parent_id: values.parent_id ?? 0,
      name: values.name,
      slug: values.slug,
      sort: values.sort ?? 0,
      status: values.status,
      remark: values.remark,
    }
    if (editing) {
      await updateCategory(editing.id, payload)
      message.success('分类已更新')
    } else {
      await createCategory(payload)
      message.success('分类已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: CmsCategory) => {
    await deleteCategory(record.id)
    message.success('分类已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<CmsCategory>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '分类名称', dataIndex: 'name', width: 180 },
    { title: '别名', dataIndex: 'slug', width: 140, render: (_, r) => r.slug || '-' },
    { title: '排序', dataIndex: 'sort', width: 70 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      valueEnum: {
        1: { text: '启用', status: 'Success' },
        0: { text: '禁用', status: 'Default' },
      },
    },
    { title: '备注', dataIndex: 'remark', width: 220, ellipsis: true, render: (_, r) => r.remark || '-' },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 190,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          {(depthMap.current.get(record.id) ?? 1) <= 2 && (
            <Auth perm="cms:category:add">
              <Button type="link" size="small" onClick={() => openCreate(record)}>
                新增子分类
              </Button>
            </Auth>
          )}
          <Auth perm="cms:category:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="cms:category:delete">
            <Popconfirm
              title="确认删除该分类?"
              description="删除后将级联影响其所有子分类"
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
      <ProTable<CmsCategory>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        pagination={false}
        expandable={{ defaultExpandAllRows: true }}
        request={async () => {
          const tree = await getCategoryTree()
          const map = new Map<number, number>()
          collectDepth(tree, 1, map)
          depthMap.current = map
          return { data: tree, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="cms:category:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
              新增顶级分类
            </Button>
          </Auth>,
        ]}
        headerTitle="分类列表"
      />
      <ModalForm<CategoryFormValues>
        title={editing ? '编辑分类' : '新增分类'}
        form={form}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (open) loadTree()
        }}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <Col span={24}>
          <ProForm.Item name="parent_id" label="上级分类">
            <TreeSelect
              treeData={treeData}
              treeDefaultExpandAll
              allowClear
              placeholder="不选则为顶级分类"
            />
          </ProForm.Item>
        </Col>
        <ProFormText
          name="name"
          label="分类名称"
          rules={[{ required: true, message: '请输入分类名称' }]}
          placeholder="分类名称"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="slug"
          label="别名"
          placeholder="英文别名"
          colProps={{ span: 12 }}
        />
        <ProFormDigit
          name="sort"
          label="排序"
          initialValue={0}
          min={0}
          fieldProps={{ precision: 0 }}
          colProps={{ span: 12 }}
        />
        <ProFormRadio.Group
          name="status"
          label="状态"
          initialValue={1}
          options={[
            { label: '启用', value: 1 },
            { label: '禁用', value: 0 },
          ]}
          colProps={{ span: 12 }}
        />
        <ProFormTextArea
          name="remark"
          label="备注"
          placeholder="备注信息"
          colProps={{ span: 24 }}
        />
      </ModalForm>
    </>
  )
}
