import { useState, useEffect } from 'react'
import { App, Button, Popconfirm, Space, Tree } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { ModalForm, ProFormText, ProFormDigit, ProFormTreeSelect } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { listCategories, createCategory, updateCategory, deleteCategory } from '../../../services/kb'
import type { KbCategory } from '../../../types/kb'

export default function CategoryPage() {
  const { message } = App.useApp()
  const [list, setList] = useState<KbCategory[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<KbCategory | null>(null)
  const [formVals, setFormVals] = useState<any>({})

  const loadList = async () => {
    const res = await listCategories()
    setList(res.list || [])
  }

  useEffect(() => { loadList() }, [])

  const openCreate = (parentId = 0) => {
    setEditing(null)
    setFormVals({ parent_id: parentId, name: '', sort: 0 })
    setModalOpen(true)
  }

  const openEdit = (cat: KbCategory) => {
    setEditing(cat)
    setFormVals({ parent_id: cat.parent_id, name: cat.name, sort: cat.sort })
    setModalOpen(true)
  }

  const handleDel = async (id: number) => {
    await deleteCategory(id)
    message.success('已删除')
    loadList()
  }

  const handleSubmit = async () => {
    if (editing) {
      await updateCategory(editing.id, formVals)
      message.success('已更新')
    } else {
      await createCategory(formVals)
      message.success('已创建')
    }
    setModalOpen(false)
    loadList()
  }

  const buildTree = (parentId = 0): any[] => {
    return list
      .filter((item) => item.parent_id === parentId)
      .map((item) => ({
        key: item.id,
        title: (
          <Space>
            <span>{item.name}</span>
            <Auth perm="kb:category:edit">
              <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openEdit(item) }} />
            </Auth>
            <Auth perm="kb:category:delete">
              <Popconfirm title="确认删除?" onConfirm={() => handleDel(item.id)}>
                <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
              </Popconfirm>
            </Auth>
          </Space>
        ),
        children: buildTree(item.id),
      }))
  }

  // 构建可选父分类树(排除当前编辑节点及其子孙,避免把自己/子嗣设为父级形成环)
  const buildParentOptions = (parentId: number, excludeId?: number): any[] => {
    return list
      .filter((item) => item.parent_id === parentId && item.id !== excludeId)
      .map((item) => ({
        title: item.name,
        value: item.id,
        children: buildParentOptions(item.id, excludeId),
      }))
  }
  const parentTreeData = [
    { title: '顶级分类(无父级)', value: 0 },
    ...buildParentOptions(0, editing?.id),
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Auth perm="kb:category:add">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate(0)}>新增分类</Button>
        </Auth>
      </div>
      {list.length > 0 ? (
        <Tree treeData={buildTree()} defaultExpandAll blockNode />
      ) : (
        <div style={{ color: '#999', textAlign: 'center', padding: 40 }}>暂无分类</div>
      )}

      <ModalForm
        title={editing ? '编辑分类' : '新增分类'}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onFinish={handleSubmit}
        initialValues={formVals}
        onValuesChange={(_, all) => setFormVals(all)}
        modalProps={{ destroyOnHidden: true }}
        width={480}
      >
        <ProFormText name="name" label="分类名称" rules={[{ required: true, message: '请输入' }]} />
        <ProFormTreeSelect
          name="parent_id"
          label="父级分类"
          fieldProps={{
            treeData: parentTreeData,
            treeDefaultExpandAll: true,
            placeholder: '默认为顶级分类',
          }}
        />
        <ProFormDigit name="sort" label="排序" min={0} />
      </ModalForm>
    </div>
  )
}
