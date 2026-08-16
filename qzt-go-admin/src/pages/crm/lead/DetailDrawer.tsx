import { useEffect, useState } from 'react'
import { Button, Descriptions, Drawer, Space, Tabs, Tag } from 'antd'
import AttachmentsPanel from '../../../components/AttachmentsPanel'
import Auth from '../../../components/Auth'
import { DictTag } from '../../../components/DictSelect'
import FollowPanel from '../customer/FollowPanel'
import { getLead } from '../../../services/lead'
import { listCustomFields } from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type { CrmCustomField } from '../../../types/crm'
import type { CrmLead } from '../../../types/lead'

interface DetailDrawerProps {
  /** 当前线索(非空即展示),null 表示关闭 */
  lead: CrmLead | null
  onClose: () => void
  /** 点击「编辑」按钮:打开编辑弹窗并关闭抽屉 */
  onEdit: (lead: CrmLead) => void
}

/** 线索详情抽屉:基本信息(含自定义字段)/ 跟进记录 / 附件 */
export default function LeadDetailDrawer({ lead, onClose, onEdit }: DetailDrawerProps) {
  const nickname = useUserStore((s) => s.nickname)
  // 自定义字段定义与值(field_id -> value)
  const [customFields, setCustomFields] = useState<CrmCustomField[]>([])
  const [detailFields, setDetailFields] = useState<Record<string, string>>({})

  const ensureCustomFields = async () => {
    if (customFields.length) return customFields
    const defs = await listCustomFields('LEAD')
    setCustomFields(defs)
    return defs
  }

  // 详情抽屉打开时加载自定义字段值
  useEffect(() => {
    if (!lead) {
      setDetailFields({})
      return
    }
    ensureCustomFields()
    getLead(lead.id)
      .then((d) => setDetailFields(d.fields ?? {}))
      .catch(() => setDetailFields({}))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead])

  const detailTarget = lead

  return (
    <Drawer
      title="线索详情"
      open={!!detailTarget}
      onClose={onClose}
      width={560}
      extra={
        detailTarget && (
          <Space>
            <Auth perm="crm:lead:edit">
              <Button type="primary" size="small" onClick={() => onEdit(detailTarget)}>
                编辑
              </Button>
            </Auth>
          </Space>
        )
      }
    >
      {detailTarget && (
        <Tabs
          items={[
            {
              key: 'info',
              label: '基本信息',
              children: (
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="线索编号">{detailTarget.lead_no || '-'}</Descriptions.Item>
                  <Descriptions.Item label="状态">
                    {(() => {
                      const m: Record<number, { text: string; color: string }> = {
                        1: { text: '新建', color: 'blue' },
                        2: { text: '跟进中', color: 'orange' },
                        3: { text: '已转化', color: 'green' },
                        4: { text: '无效', color: 'default' },
                      }
                      const s = m[detailTarget.status]
                      return s ? <Tag color={s.color}>{s.text}</Tag> : '-'
                    })()}
                  </Descriptions.Item>
                  <Descriptions.Item label="线索名称" span={2}>
                    <Space size={4}>
                      {detailTarget.name}
                      {detailTarget.in_pool === 1 && <Tag color="orange">公海</Tag>}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="联系人">{detailTarget.contact_name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="电话">{detailTarget.phone || '-'}</Descriptions.Item>
                  <Descriptions.Item label="邮箱" span={2}>{detailTarget.email || '-'}</Descriptions.Item>
                  <Descriptions.Item label="公司" span={2}>{detailTarget.company || '-'}</Descriptions.Item>
                  <Descriptions.Item label="级别">
                    <DictTag code="LEAD_LEVEL" value={detailTarget.level} />
                  </Descriptions.Item>
                  <Descriptions.Item label="来源">
                    <DictTag code="LEAD_SOURCE" value={detailTarget.source} />
                  </Descriptions.Item>
                  <Descriptions.Item label="行业">
                    <DictTag code="INDUSTRY" value={detailTarget.industry} />
                  </Descriptions.Item>
                  <Descriptions.Item label="负责人">
                    {detailTarget.in_pool === 1 ? '公海' : nickname(detailTarget.owner_id)}
                  </Descriptions.Item>
                  <Descriptions.Item label="所属">{detailTarget.in_pool === 1 ? '公海池' : '私海'}</Descriptions.Item>
                  <Descriptions.Item label="转化客户">
                    {detailTarget.converted_customer_id ? `#${detailTarget.converted_customer_id}` : '-'}
                  </Descriptions.Item>
                  {detailTarget.follow_time && (
                    <Descriptions.Item label="最近跟进" span={2}>
                      {detailTarget.follow_time}
                    </Descriptions.Item>
                  )}
                  {detailTarget.converted_at && (
                    <Descriptions.Item label="转化时间" span={2}>
                      {detailTarget.converted_at}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="创建时间" span={2}>
                    {detailTarget.created_at}
                  </Descriptions.Item>
                  <Descriptions.Item label="更新时间" span={2}>
                    {detailTarget.updated_at}
                  </Descriptions.Item>
                  {customFields.map((f) => (
                    <Descriptions.Item label={f.name} key={f.id}>
                      {detailFields[f.id] || '-'}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              ),
            },
            {
              key: 'follow',
              label: '跟进记录',
              children: <FollowPanel leadId={detailTarget.id} />,
            },
            {
              key: 'attachments',
              label: '附件',
              children: (
                <AttachmentsPanel
                  bizType="LEAD"
                  resourceId={detailTarget.id}
                  uploadPerm="crm:lead:edit"
                  deletePerm="crm:lead:edit"
                />
              ),
            },
          ]}
        />
      )}
    </Drawer>
  )
}
