import { useEffect, useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Popconfirm,
  Row,
  Space,
  Tag,
  Tree,
  type TreeProps,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProFormDigit,
  ProFormSegmented,
  ProFormText,
  ProFormTreeSelect,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import {
  createProductCategory,
  deleteProductCategory,
  getProductCategoryTree,
  updateProductCategory,
} from '../../../services/productCategory'
import type { ProductCategory, ProductCategoryPayload } from '../../../types/productCategory'

interface PCFormValues {
  name: string
  parent_id: number
  sort?: number
  status: number
}

/** 管理页「上级分类」下拉节点(按 id 选) */
type ParentOption = { title: string; value: number; children?: ParentOption[] }

/** 构建父级选择树;excludeId 用于编辑时排除自身及子孙防环 */
const buildParentOptions = (list: ProductCategory[], excludeId?: number): ParentOption[] =>
  list
    .filter((n) => n.id !== excludeId)
    .map((n) => ({
      title: n.name,
      value: n.id,
      children: n.children?.length ? buildParentOptions(n.children, excludeId) : undefined,
    }))

const findNode = (list: ProductCategory[], id: number): ProductCategory | null => {
  for (const n of list) {
    if (n.id === id) return n
    const hit = n.children?.length ? findNode(n.children, id) : null
    if (hit) return hit
  }
  return null
}

/** 收集所有有子节点的 id 作为默认展开项 */
const collectExpandKeys = (list: ProductCategory[], acc: number[] = []): number[] => {
  list.forEach((n) => {
    if (n.children?.length) {
      acc.push(n.id)
      collectExpandKeys(n.children, acc)
    }
  })
  return acc
}

export default function ProductCategoryPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<PCFormValues>()
  const [tree, setTree] = useState<ProductCategory[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<number[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProductCategory | null>(null)
  const [mode, setMode] = useState<'root' | 'child'>('root')

  const selected = useMemo(
    () => (selectedId == null ? null : findNode(tree, selectedId)),
    [tree, selectedId],
  )

  const loadTree = async () => {
    const data = await getProductCategoryTree()
    setTree(data)
    setExpandedKeys(collectExpandKeys(data))
  }

  useEffect(() => {
    loadTree().catch(() => {})
  }, [])

  const openCreateRoot = () => {
    setEditing(null)
    setMode('root')
    form.resetFields()
    form.setFieldsValue({ parent_id: 0, sort: 0, status: 1 })
    setModalOpen(true)
  }

  const openCreateChild = () => {
    if (!selected) {
      message.warning('请先在左侧树中选中一个分类')
      return
    }
    setEditing(null)
    setMode('child')
    form.resetFields()
    form.setFieldsValue({ parent_id: selected.id, sort: 0, status: 1 })
    setModalOpen(true)
  }

  const openEdit = () => {
    if (!selected) {
      message.warning('请先在左侧树中选中一个分类')
      return
    }
    setEditing(selected)
    form.resetFields()
    form.setFieldsValue({
      name: selected.name,
      parent_id: selected.parent_id || 0,
      sort: selected.sort ?? 0,
      status: selected.status,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: PCFormValues) => {
    const payload: ProductCategoryPayload = {
      name: values.name.trim(),
      parent_id: values.parent_id || 0,
      sort: values.sort ?? 0,
      status: values.status,
    }
    if (editing) {
      await updateProductCategory(editing.id, payload)
      message.success('分类已更新')
    } else {
      await createProductCategory(payload)
      message.success('分类已创建')
      setSelectedId(null)
    }
    await loadTree()
    return true
  }

  const handleDelete = async (node: ProductCategory) => {
    await deleteProductCategory(node.id)
    message.success('分类已删除')
    setSelectedId(null)
    await loadTree()
  }

  // 编辑时排除自身及子孙节点防止成环
  const parentOptions = useMemo(
    () => [{ title: '一级分类(无父级)', value: 0 }, ...buildParentOptions(tree, editing?.id)],
    [tree, editing],
  )

  const treeData: TreeProps['treeData'] = useMemo(() => {
    const build = (list: ProductCategory[]): TreeProps['treeData'] =>
      list.map((n) => ({
        key: n.id,
        title: (
          <span style={n.status === 0 ? { color: '#999' } : undefined}>
            {n.name}
            {n.status === 0 ? '(停用)' : ''}
          </span>
        ),
        children: n.children?.length ? build(n.children) : undefined,
      }))
    return build(tree)
  }, [tree])

  const selectedParent = selected?.parent_id ? findNode(tree, selected.parent_id) : null

  return (
    <Row gutter={16}>
      <Col xs={24} md={10} xl={8}>
        <Card title="产品分类树">
          <Space wrap style={{ marginBottom: 12 }}>
            <Auth perm="crm:productCategory:edit">
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRoot}>
                新增一级分类
              </Button>
            </Auth>
            <Auth perm="crm:productCategory:edit">
              <Button disabled={!selected} onClick={openCreateChild}>
                新增子分类
              </Button>
            </Auth>
            <Auth perm="crm:productCategory:edit">
              <Button disabled={!selected} onClick={openEdit}>
                编辑
              </Button>
            </Auth>
            <Auth perm="crm:productCategory:delete">
              <Popconfirm
                title="确认删除该分类?"
                description="存在子分类或已被商品引用时后端将拒绝删除"
                okText="删除"
                okButtonProps={{ danger: true }}
                cancelText="取消"
                disabled={!selected}
                onConfirm={() => selected && handleDelete(selected)}
              >
                <Button danger disabled={!selected}>
                  删除
                </Button>
              </Popconfirm>
            </Auth>
          </Space>
          {tree.length === 0 ? (
            <Empty description="暂无分类" />
          ) : (
            <Tree
              blockNode
              treeData={treeData}
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys.map(Number))}
              selectedKeys={selectedId != null ? [selectedId] : []}
              onSelect={(keys) => setSelectedId(keys.length ? Number(keys[0]) : null)}
            />
          )}
        </Card>
      </Col>
      <Col xs={24} md={14} xl={16}>
        <Card title="分类详情">
          {selected ? (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="名称">{selected.name}</Descriptions.Item>
              <Descriptions.Item label="上级分类">
                {selected.parent_id ? selectedParent?.name || selected.parent_id : '一级分类'}
              </Descriptions.Item>
              <Descriptions.Item label="排序">{selected.sort ?? 0}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={selected.status === 0 ? 'default' : 'success'}>
                  {selected.status === 0 ? '停用' : '启用'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="子分类数量">{selected.children?.length || 0}</Descriptions.Item>
            </Descriptions>
          ) : (
            <Empty description="在左侧选中分类节点后查看详情" />
          )}
        </Card>
      </Col>
      <ModalForm<PCFormValues>
        title={editing ? '编辑分类' : mode === 'child' ? '新增子分类' : '新增一级分类'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={520}
        grid
      >
        <ProFormText
          name="name"
          label="分类名称"
          rules={[{ required: true, message: '请输入分类名称' }]}
          placeholder="请输入分类名称"
          colProps={{ span: 24 }}
        />
        <ProFormTreeSelect
          name="parent_id"
          label="上级分类"
          placeholder="请选择上级分类"
          colProps={{ span: 24 }}
          fieldProps={{
            treeData: parentOptions,
            treeDefaultExpandAll: true,
            treeNodeFilterProp: 'title',
            showSearch: true,
          }}
          extra="选「一级分类(无父级)」表示顶级分类;编辑时自身及子孙不可选以防成环"
        />
        <ProFormDigit name="sort" label="排序" min={0} precision={0} colProps={{ span: 12 }} />
        <ProFormSegmented
          name="status"
          label="状态"
          fieldProps={{
            options: [
              { label: '启用', value: 1 },
              { label: '停用', value: 0 },
            ],
          }}
          colProps={{ span: 12 }}
        />
      </ModalForm>
    </Row>
  )
}
