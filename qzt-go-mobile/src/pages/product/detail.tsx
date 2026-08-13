import { useEffect, useState } from 'react'
import { Button, Card, Dialog, ErrorBlock, List, NavBar, SpinLoading, Tag, Toast } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteProduct, getProduct, updateProduct } from '../../services/crm'
import type { CrmProduct } from '../../types/crm'
import FormSheet from '../../components/FormSheet'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<CrmProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [acting, setActing] = useState(false)

  const reload = () => {
    if (!id) return
    setLoading(true)
    setError(false)
    getProduct(Number(id))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(reload, [id])

  if (loading) {
    return <div style={{ paddingTop: '40vh', textAlign: 'center' }}><SpinLoading style={{ '--size': '40px' }} /></div>
  }
  if (error || !data) {
    return <ErrorBlock status="default" title="加载失败" />
  }

  const onDelete = async () => {
    const ok = await Dialog.confirm({ content: `确定删除产品「${data.name}」?` })
    if (!ok) return
    setActing(true)
    try {
      await deleteProduct(data.id)
      Toast.show({ icon: 'success', content: '已删除' })
      navigate(-1)
    } catch {
    } finally {
      setActing(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 24 }}>
      <NavBar onBack={() => navigate(-1)}>产品详情</NavBar>
      <Card title="产品信息" style={{ margin: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{data.name}</span>
          {data.status === 2 && <Tag color="default">已下架</Tag>}
        </div>
        <List>
          <List.Item extra={data.product_no}>产品编号</List.Item>
          <List.Item extra={data.category || '-'}>分类</List.Item>
          <List.Item extra={data.spec || '-'}>规格</List.Item>
          <List.Item extra={data.unit || '-'}>单位</List.Item>
          <List.Item extra={data.price ? `¥${data.price}` : '-'}>标准价</List.Item>
          {data.description && <List.Item extra={data.description}>描述</List.Item>}
        </List>
      </Card>

      <div style={{ margin: 8, display: 'flex', gap: 8 }}>
        <Button block color="primary" fill="outline" onClick={() => setShowEdit(true)}>编辑</Button>
        <Button block color="danger" fill="outline" onClick={onDelete} loading={acting}>删除</Button>
      </div>

      <FormSheet
        visible={showEdit}
        title="编辑产品"
        fields={[
          { name: 'name', label: '产品名称', type: 'text', required: true },
          { name: 'category', label: '分类', type: 'text' },
          { name: 'unit', label: '单位', type: 'text' },
          { name: 'standard_price', label: '标准价', type: 'number' },
          { name: 'cost_price', label: '成本价', type: 'number' },
          { name: 'description', label: '描述', type: 'textarea' },
        ]}
        initialValues={{ name: data.name, category: data.category, unit: data.unit, standard_price: data.price, description: data.description }}
        onClose={() => setShowEdit(false)}
        onSubmit={async (v) => {
          await updateProduct(data.id, {
            name: v.name,
            category: v.category || undefined,
            unit: v.unit || undefined,
            standard_price: v.standard_price ? Number(v.standard_price) : undefined,
            cost_price: v.cost_price ? Number(v.cost_price) : undefined,
            description: v.description || undefined,
          })
          reload()
        }}
      />
    </div>
  )
}
