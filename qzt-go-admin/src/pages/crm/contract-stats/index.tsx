import { useEffect, useState } from 'react'
import { Card, Col, Empty, Row, Spin, Statistic, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import Chart, { barOption } from '../../../components/Chart'
import { useDictStore } from '../../../stores/dict'
import { getContractStats } from '../../../services/crm'
import type { CrmContractExpiring, CrmContractStats } from '../../../types/crm'

/** 金额字段后端以字符串(decimal)返回 */
const toAmount = (value?: string) => Number(value) || 0

/** 到期剩余天数着色:7 天内紧急,30 天内预警 */
function daysLeftTag(days: number) {
  if (days < 0) return <Tag color="red">已到期 {Math.abs(days)} 天</Tag>
  if (days <= 7) return <Tag color="red">{days} 天</Tag>
  if (days <= 30) return <Tag color="orange">{days} 天</Tag>
  return <Tag color="default">{days} 天</Tag>
}

export default function ContractStatsPage() {
  const navigate = useNavigate()
  const dictLabel = useDictStore((s) => s.label)

  const [stats, setStats] = useState<CrmContractStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    getContractStats()
      .then(setStats)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  const stageStats = stats?.by_stage ?? []
  const stageNames = stageStats.map((s) => dictLabel('CONTRACT_STAGE', s.stage))
  const expiring: CrmContractExpiring[] = stats?.expiring ?? []

  const expiringColumns: ColumnsType<CrmContractExpiring> = [
    { title: '合同', dataIndex: 'name', width: 220, ellipsis: true },
    { title: '客户', dataIndex: 'customer_name', width: 160, ellipsis: true },
    { title: '到期日', dataIndex: 'end_date', width: 110, render: (v) => v || '-' },
    { title: '剩余天数', dataIndex: 'days_left', width: 110, align: 'center', render: (v: number) => daysLeftTag(v) },
    { title: '负责人', dataIndex: 'owner_name', width: 110, render: (v) => v || '-' },
  ]

  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center' }}>
        <Spin />
      </div>
    )
  }

  if (failed || !stats) {
    return (
      <Card>
        <Empty description={<Typography.Text type="secondary">加载失败,请稍后重试</Typography.Text>} />
      </Card>
    )
  }

  return (
    <div>
      {/* 顶部统计卡:合同总金额 / 本月签约 / 各阶段数量 */}
      <Row gutter={[16, 16]}>
        <Col xs={12} md={4}>
          <Card bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#8c8c8c' }}>合同总金额</span>}
              value={toAmount(stats.total_amount)}
              prefix="¥"
              precision={2}
              valueStyle={{ fontWeight: 600, fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={4}>
          <Card bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: '#8c8c8c' }}>本月签约</span>}
              value={toAmount(stats.signed_month_amount)}
              prefix="¥"
              precision={2}
              valueStyle={{ fontWeight: 600, fontSize: 22 }}
            />
          </Card>
        </Col>
        {stageStats.map((s) => (
          <Col xs={12} sm={8} md={2} key={s.stage}>
            <Card size="small" bodyStyle={{ padding: '16px 20px' }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{dictLabel('CONTRACT_STAGE', s.stage)}</span>}
                value={s.count}
                valueStyle={{ fontSize: 18 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 阶段分布:数量(柱状)+ 金额(横向条形),同一份 by_stage 两个视角 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="各阶段合同数量">
            <Chart
              height={320}
              option={barOption('各阶段合同数量', stageNames, [
                { name: '合同数量', data: stageStats.map((s) => s.count) },
              ])}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="各阶段合同金额">
            <Chart
              height={320}
              option={barOption(
                '各阶段合同金额',
                stageNames,
                [{ name: '合同金额', data: stageStats.map((s) => toAmount(s.amount)) }],
                true,
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* 到期提醒:行点击跳合同列表 */}
      <Card
        title="到期提醒"
        style={{ marginTop: 16 }}
        extra={<Typography.Text type="secondary">点击行查看合同列表</Typography.Text>}
      >
        <Table<CrmContractExpiring>
          rowKey="id"
          size="small"
          columns={expiringColumns}
          dataSource={expiring}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: '暂无即将到期的合同' }}
          onRow={() => ({
            style: { cursor: 'pointer' },
            onClick: () => navigate('/crm/contract'),
          })}
          summary={() =>
            expiring.length > 0 ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}>
                  共 {expiring.length} 份合同即将/已经到期
                </Table.Summary.Cell>
              </Table.Summary.Row>
            ) : null
          }
        />
      </Card>
    </div>
  )
}
