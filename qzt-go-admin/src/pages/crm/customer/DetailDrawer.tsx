import { useEffect, useState } from 'react'
import { Descriptions, Drawer, Tabs, Tag } from 'antd'
import { DictTag } from '../../../components/DictSelect'
import { getCustomer, listCustomFields } from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type { CrmCustomField, CrmCustomer, CrmCustomerDetail } from '../../../types/crm'
import ContactsPanel from './ContactsPanel'
import FollowPanel from './FollowPanel'
import OwnerHistoryPanel from './OwnerHistoryPanel'

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

  useEffect(() => {
    if (!open || !customer) {
      setDetail(null)
      return
    }
    const load = async () => {
      const [d, fields] = await Promise.all([
        getCustomer(customer.id),
        listCustomFields('CUSTOMER'),
      ])
      setDetail(d)
      setCustomFields(fields)
    }
    load()
  }, [open, customer])

  const c = detail?.customer ?? customer

  return (
    <Drawer
      title={c ? `客户详情:${c.name}` : '客户详情'}
      width={720}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {c && (
        <Tabs
          items={[
            {
              key: 'info',
              label: '基本信息',
              children: (
                <Descriptions bordered size="small" column={2}>
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
              ),
            },
            { key: 'contacts', label: '联系人', children: <ContactsPanel customerId={c.id} /> },
            { key: 'follow', label: '跟进记录', children: <FollowPanel customerId={c.id} /> },
            {
              key: 'history',
              label: '归属历史',
              children: <OwnerHistoryPanel customerId={c.id} />,
            },
          ]}
        />
      )}
    </Drawer>
  )
}
