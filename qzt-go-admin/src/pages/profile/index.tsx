import { useEffect, useRef, useState } from 'react'
import { Avatar, Button, Card, Col, Descriptions, Row, Space, Spin, Statistic, Tabs, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined, EditOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { getDashboardOverview } from '../../services/dashboard'
import { BasicInfoTab, PasswordTab, WecomTab, ApiKeyTab } from '../../components/layout/ProfileCenter'
import type { DashboardOverview } from '../../types/dashboard'

export default function ProfilePage() {
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('basic')
  const tabsRef = useRef<HTMLDivElement>(null)

  // 「编辑资料」按钮:切到基本信息 tab 并滚动聚焦到右栏编辑区
  const focusEdit = () => {
    setActiveTab('basic')
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    getDashboardOverview()
      .then(setOverview)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const joinDate = profile?.created_at ? new Date(profile.created_at).getFullYear() : null

  const stats = overview
    ? [
        { title: '客户总数', value: overview.customer_total, path: '/crm/customer' },
        { title: '商机总数', value: overview.opportunity_total, path: '/crm/opportunity' },
        { title: '合同总数', value: overview.contract_total, path: '/crm/contract' },
        { title: '待审批', value: overview.approval_pending, path: '/approval/todo' },
      ]
    : []

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* ── 顶部导航栏 ── */}
      <div
        style={{
          background: '#fff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ fontSize: 16 }}
        />
        <Typography.Title level={5} style={{ margin: 0 }}>
          个人中心
        </Typography.Title>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        {/* ── 个人名片 ── */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <Avatar size={80} src={profile?.avatar || undefined}>
              {profile?.nickname?.[0] || profile?.username?.[0]}
            </Avatar>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Space align="center" size={12}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {profile?.nickname || '用户'}
                </Typography.Title>
                <Typography.Text type="secondary">@{profile?.username}</Typography.Text>
              </Space>
              <div style={{ marginTop: 8 }}>
                <Space size={[4, 8]} wrap>
                  {profile?.roles?.map((r) => (
                    <Tag color="blue" key={r.id}>{r.name}</Tag>
                  ))}
                  {profile?.wecom_user_id ? (
                    <Tag color="green" icon={<CheckCircleOutlined />}>企微已绑定</Tag>
                  ) : (
                    <Tag>企微未绑定</Tag>
                  )}
                  {joinDate && <Tag>{joinDate} 年加入</Tag>}
                </Space>
              </div>
            </div>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={focusEdit}
            >
              编辑资料
            </Button>
          </div>
        </Card>

        <Row gutter={[16, 16]}>
          {/* ── 左栏 ── */}
          <Col xs={24} lg={8}>
            <Card title="个人信息" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="昵称">{profile?.nickname || '-'}</Descriptions.Item>
                <Descriptions.Item label="用户名">{profile?.username || '-'}</Descriptions.Item>
                <Descriptions.Item label="邮箱">{profile?.email || '-'}</Descriptions.Item>
                <Descriptions.Item label="手机">{profile?.phone || '-'}</Descriptions.Item>
                <Descriptions.Item label="角色">
                  {profile?.roles?.map((r) => r.name).join('、') || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="企微">
                  {profile?.wecom_user_id || '未绑定'}
                </Descriptions.Item>
                <Descriptions.Item label="加入时间">
                  {profile?.created_at?.slice(0, 10) || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {profile?.employee && (
              <Card title="员工档案" style={{ marginBottom: 16 }}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="工号">{profile.employee.emp_no || '-'}</Descriptions.Item>
                  <Descriptions.Item label="真实姓名">{profile.employee.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="部门">{profile.employee.dept_name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="岗位">{profile.employee.pos_name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="入职日期">{profile.employee.entry_date?.slice(0, 10) || '-'}</Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            <Card title="我的数据">
              {loading ? (
                <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
              ) : (
                <Row gutter={[16, 16]}>
                  {stats.map((s) => (
                    <Col span={12} key={s.title}>
                      <Link to={s.path}>
                        <Statistic
                          title={s.title}
                          value={s.value}
                          valueStyle={{ fontSize: 22, fontWeight: 600 }}
                        />
                      </Link>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </Col>

          {/* ── 右栏：Tabs ── */}
          <Col xs={24} lg={16}>
            <div ref={tabsRef}>
            <Card>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  { key: 'basic', label: '基本信息', children: <BasicInfoTab /> },
                  { key: 'password', label: '修改密码', children: <PasswordTab /> },
                  { key: 'wecom', label: '企业微信', children: <WecomTab /> },
                  { key: 'apikey', label: 'API Key', children: <ApiKeyTab /> },
                ]}
              />
            </Card>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  )
}
