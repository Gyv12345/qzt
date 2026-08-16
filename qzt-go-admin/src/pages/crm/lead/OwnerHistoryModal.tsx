import { useEffect, useState } from 'react'
import { ModalForm } from '@ant-design/pro-components'
import { Space, Tag } from 'antd'
import { getLeadOwnerHistory } from '../../../services/lead'
import { useUserStore } from '../../../stores/users'
import type { CrmLead, CrmLeadOwnerHistory } from '../../../types/lead'

const ACTION_TEXT: Record<string, string> = {
  TAKE: '领取',
  RELEASE: '释放',
  TRANSFER: '转移',
  RECYCLE: '自动回收',
}

interface OwnerHistoryModalProps {
  /** 目标线索(非空即打开),关闭时置 null */
  target: CrmLead | null
  onClose: () => void
}

/** 线索归属历史弹窗:领取/释放/转移/回收流水 */
export default function OwnerHistoryModal({ target, onClose }: OwnerHistoryModalProps) {
  const nickname = useUserStore((s) => s.nickname)
  const [history, setHistory] = useState<CrmLeadOwnerHistory[]>([])

  // 打开时拉取归属历史
  useEffect(() => {
    if (!target) return
    getLeadOwnerHistory(target.id)
      .then((list) => setHistory(list))
      .catch(() => setHistory([]))
  }, [target])

  return (
    <ModalForm
      title={target ? `归属历史:${target.name}` : '归属历史'}
      open={!!target}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      onFinish={async () => true}
      width={560}
      submitter={false}
    >
      {history.length === 0 ? (
        <div style={{ color: '#999', textAlign: 'center', padding: 24 }}>暂无记录</div>
      ) : (
        <div>
          {history.map((h) => (
            <div key={h.id} style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
              <Space>
                <Tag color="blue">{ACTION_TEXT[h.action] || h.action}</Tag>
                <span>{h.owner_id !== null ? nickname(h.owner_id) : '公海'}</span>
                <span style={{ color: '#999', fontSize: 12 }}>{h.created_at}</span>
              </Space>
              {h.reason && <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{h.reason}</div>}
            </div>
          ))}
        </div>
      )}
    </ModalForm>
  )
}
