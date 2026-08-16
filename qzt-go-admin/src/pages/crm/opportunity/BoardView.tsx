import { Button, Card, Col, Dropdown, Empty, Row, Space, Spin, Tag } from 'antd'
import type { CrmOpportunity, StageDef } from '../../../types/crm'

interface BoardViewProps {
  /** 排序后的阶段定义 */
  stages: StageDef[]
  /** 阶段 key -> 商机列表 */
  board: Record<string, CrmOpportunity[]>
  loading: boolean
  /** 客户 id -> 名称 */
  customerMap: Record<number, string>
  /** 点击卡片进入编辑 */
  onEdit: (record: CrmOpportunity) => void
  /** 卡片快捷流转 */
  onStageChange: (record: CrmOpportunity, stage: string) => void
}

/** 商机看板视图:按阶段分列,卡片支持点击编辑与快捷流转 */
export default function BoardView({ stages, board, loading, customerMap, onEdit, onStageChange }: BoardViewProps) {
  return (
    <Spin spinning={loading}>
      <Row gutter={12} wrap={false} style={{ overflowX: 'auto', paddingBottom: 8, alignItems: 'stretch' }}>
        {stages.map((stage) => {
          const items = board[stage.key] ?? []
          return (
            <Col key={stage.key} flex="0 0 280px" style={{ display: 'flex' }}>
              <Card
                size="small"
                style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 220px)' }}
                styles={{ body: { flex: 1, overflowY: 'auto', padding: 8 } }}
                title={
                  <Space size={8}>
                    <Tag color={stage.color}>{stage.label}</Tag>
                    <span style={{ color: '#999' }}>{items.length}</span>
                  </Space>
                }
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {items.map((o) => (
                    <Card key={o.id} size="small" hoverable onClick={() => onEdit(o)}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{o.name}</div>
                      <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
                        {customerMap[o.customer_id] ?? `#${o.customer_id}`}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>{o.expected_amount ? `¥${o.expected_amount}` : '-'}</span>
                        <span style={{ color: '#666', fontSize: 12 }}>
                          {o.probability !== null && o.probability !== undefined
                            ? `${o.probability}%`
                            : '-'}
                        </span>
                        <Dropdown
                          menu={{
                            items: stages
                              .filter((s) => s.key !== o.stage)
                              .map((s) => ({ key: s.key, label: `流转到 ${s.label}` })),
                            onClick: ({ key, domEvent }) => {
                              domEvent.stopPropagation()
                              onStageChange(o, key)
                            },
                          }}
                        >
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: 0 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            流转
                          </Button>
                        </Dropdown>
                      </div>
                    </Card>
                  ))}
                  {items.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                </Space>
              </Card>
            </Col>
          )
        })}
      </Row>
    </Spin>
  )
}
