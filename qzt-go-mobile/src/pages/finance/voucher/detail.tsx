import { useEffect, useState } from 'react'
import { Button, Card, Dialog, ErrorBlock, NavBar, SpinLoading, Tag, Toast } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import { confirmVoucher, getVoucher } from '../../../services/finance'
import { BALANCE_DIR, VOUCHER_STATUS, type FinVoucher } from '../../../types/finance'

export default function VoucherDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<FinVoucher | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(false)
    getVoucher(Number(id))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  const onConfirm = async () => {
    if (!data) return
    const ok = await Dialog.confirm({ content: '确认过账此凭证?' })
    if (!ok) return
    setActing(true)
    try {
      await confirmVoucher(data.id)
      Toast.show({ icon: 'success', content: '已过账' })
      if (!id) return
      getVoucher(Number(id)).then(setData)
    } catch {
    } finally {
      setActing(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>凭证详情</NavBar>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><SpinLoading /></div>
      ) : error || !data ? (
        <ErrorBlock status="empty" description="加载失败" />
      ) : (
        <div style={{ padding: 12 }}>
          <Card title="基本信息">
            <div style={{ fontSize: 14, lineHeight: 2 }}>
              <div>编号:{data.voucher_no}</div>
              <div>日期:{data.voucher_date}</div>
              <div>摘要:{data.description}</div>
              <div>方向:{BALANCE_DIR[data.direction] || data.direction}</div>
              <div>状态:<Tag color={VOUCHER_STATUS[data.status]?.color} fill="outline">{VOUCHER_STATUS[data.status]?.text}</Tag></div>
              {data.remark && <div>备注:{data.remark}</div>}
            </div>
          </Card>
          <Card title="金额" style={{ marginTop: 12 }}>
            <div style={{ color: '#ff4d4f', fontSize: 18, fontWeight: 600 }}>¥{Number(data.amount || 0).toFixed(2)}</div>
          </Card>
          {data.status === 'DRAFT' && (
            <Button block color="primary" fill="outline" style={{ marginTop: 12 }} loading={acting} onClick={onConfirm}>过账</Button>
          )}
        </div>
      )}
    </div>
  )
}
