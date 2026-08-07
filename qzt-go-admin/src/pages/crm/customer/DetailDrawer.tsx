import { useEffect, useState } from 'react'
import { Button, Descriptions, Drawer, Spin, Tabs, Tag } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import AttachmentsPanel from '../../../components/AttachmentsPanel'
import Auth from '../../../components/Auth'
import MailComposeModal from '../../../components/MailComposeModal'
import { DictTag } from '../../../components/DictSelect'
import { getCustomer, listCustomFields } from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type { CrmCustomField, CrmCustomer, CrmCustomerDetail } from '../../../types/crm'
import ContactsPanel from './ContactsPanel'
import ContractsPanel from './ContractsPanel'
import FollowPanel from './FollowPanel'
import OpportunitiesPanel from './OpportunitiesPanel'
import OwnerHistoryPanel from './OwnerHistoryPanel'
import TeamPanel from './TeamPanel'
import ChangeLogPanel from './ChangeLogPanel'

const STATUS_MAP: Record<number, { text: string; color: string }> = {
  1: { text: '正常', color: 'success' },
  2: { text: '冻结', color: 'warning' },
  3: { text: '流失', color: 'default' },
}

interface DetailDrawerProps {
  customer: CrmCustomer | null
  open: boolean
  onClose: () => void
}

/** 客户详情抽屉:基本信息 / 联系人 / 跟进记录 / 归属历史 */
export default function DetailDrawer({ customer, open, onClose }: DetailDrawerProps) {
  const nickname = useUserStore((s) => s.nickname)
  const [detail, setDetail] = useState<CrmCustomerDetail | null>(null)
  const [customFields, setCustomFields] = useState<CrmCustomField[]>([])
  const [loading, setLoading] = useState(false)
  const [mailOpen, setMailOpen] = useState(false)

  useEffect(() => {
    if (!open || !customer) {
      setDetail(null)
      return
    }
    const load = async () => {
      setLoading(true)
      try {
        const [d, fields] = await Promise.all([
          getCustomer(customer.id),
          listCustomFields('CUSTOMER'),
        ])
        setDetail(d)
        setCustomFields(fields)
      } catch {
        // 失败时 fallback 到外部传入的 customer 基本信息(与原行为一致)
        setDetail(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open, customer])

  const c = detail?.customer ?? customer

  return (
    <>
      <Drawer
        title={c ? `客户详情:${c.name}` : '客户详情'}
        width={720}
        open={open}
        onClose={onClose}
        destroyOnHidden
        extra={
          <Auth perm="mail:send">
            <Button size="small" icon={<MailOutlined />} onClick={() => setMailOpen(true)}>
              发邮件
            </Button>
          </Auth>
        }
      >
      {c && (
        <Spin spinning={loading}>
        <>
        {/* 基本信息(固定在 Tab 上方) */}
        <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="客户名称">{c.name}</Descriptions.Item>
          <Descriptions.Item label="客户编号">{c.customer_no || '-'}</Descriptions.Item>
          <Descriptions.Item label="等级">
            <DictTag code="CUSTOMER_LEVEL" value={c.level} />
          </Descriptions.Item>
          <Descriptions.Item label="来源">
            <DictTag code="CUSTOMER_SOURCE" value={c.source} />
          </Descriptions.Item>
          <Descriptions.Item label="行业">
            <DictTag code="INDUSTRY" value={c.industry} />
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {STATUS_MAP[c.status] ? (
              <Tag color={STATUS_MAP[c.status].color}>{STATUS_MAP[c.status].text}</Tag>
            ) : (
              c.status
            )}
          </Descriptions.Item>
          <Descriptions.Item label="负责人">
            {c.in_pool === 1 ? <Tag color="orange">公海</Tag> : nickname(c.owner_id)}
          </Descriptions.Item>
          <Descriptions.Item label="最新跟进时间">
            {c.follow_time ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{c.created_at}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{c.updated_at}</Descriptions.Item>
          {customFields.map((f) => (
            <Descriptions.Item key={f.id} label={f.name}>
              {detail?.fields?.[f.id] || '-'}
            </Descriptions.Item>
          ))}
        </Descriptions>

        <Tabs
          defaultActiveKey="follow"
          items={[
            {
              key: 'follow',
              label: '跟进记录',
              children: <FollowPanel customerId={c.id} />,
            },
            {
              key: 'contacts',
              label: '联系人',
              children: <ContactsPanel customerId={c.id} />,
            },
            {
              key: 'team',
              label: '团队',
              children: <TeamPanel customerId={c.id} />,
            },
            {
              key: 'opportunities',
              label: '商机',
              children: <OpportunitiesPanel customerId={c.id} />,
            },
            {
              key: 'contracts',
              label: '合同',
              children: <ContractsPanel customerId={c.id} />,
            },
            {
              key: 'history',
              label: '归属历史',
              children: <OwnerHistoryPanel customerId={c.id} />,
            },
            {
              key: 'changelog',
              label: '变更历史',
              children: <ChangeLogPanel bizType="CUSTOMER" resourceId={c.id} />,
            },
            {
              key: 'attachments',
              label: '附件',
              children: (
                <AttachmentsPanel
                  bizType="CUSTOMER"
                  resourceId={c.id}
                  uploadPerm="crm:customer:edit"
                  deletePerm="crm:customer:edit"
                />
              ),
            },
          ]}
        />
        </>
        </Spin>
      )}
      </Drawer>

      {/* 写邮件(客户无主邮箱,收件人在弹窗中手动填写,可从联系人 Tab 复制) */}
      <MailComposeModal open={mailOpen} onClose={() => setMailOpen(false)} defaultToName={c?.name} />
    </>
  )
}
