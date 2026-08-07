import { useState } from 'react'
import { Button, Descriptions, Drawer, Tabs, Tag } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import AttachmentsPanel from '../../../components/AttachmentsPanel'
import Auth from '../../../components/Auth'
import MailComposeModal from '../../../components/MailComposeModal'
import type { CrmContactListItem } from '../../../services/crm'

interface DetailDrawerProps {
  contact: CrmContactListItem | null
  open: boolean
  onClose: () => void
}

/** 联系人详情抽屉:基本信息 / 附件 */
export default function DetailDrawer({ contact, open, onClose }: DetailDrawerProps) {
  const [mailOpen, setMailOpen] = useState(false)
  return (
    <>
      <Drawer
        title={contact ? `联系人详情:${contact.name}` : '联系人详情'}
        width={640}
        open={open}
        onClose={onClose}
        destroyOnHidden
        extra={
          contact?.email ? (
            <Auth perm="mail:send">
              <Button size="small" icon={<MailOutlined />} onClick={() => setMailOpen(true)}>
                发邮件
              </Button>
            </Auth>
          ) : null
        }
      >
      {contact && (
        <Tabs
          items={[
            {
              key: 'info',
              label: '基本信息',
              children: (
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="姓名">{contact.name}</Descriptions.Item>
                  <Descriptions.Item label="联系人编号">
                    {contact.contact_no || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="所属客户" span={2}>
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0 }}
                      onClick={() =>
                        window.open(`/crm/customer?customer_id=${contact.customer_id}`, '_blank')
                      }
                    >
                      {contact.customer_name || `#${contact.customer_id}`}
                    </Button>
                  </Descriptions.Item>
                  <Descriptions.Item label="职务">{contact.position || '-'}</Descriptions.Item>
                  <Descriptions.Item label="部门">{contact.department || '-'}</Descriptions.Item>
                  <Descriptions.Item label="电话">{contact.phone || '-'}</Descriptions.Item>
                  <Descriptions.Item label="邮箱">{contact.email || '-'}</Descriptions.Item>
                  <Descriptions.Item label="关键决策人">
                    {contact.is_key_decision_maker === 1 ? <Tag color="gold">是</Tag> : '否'}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    {contact.status === 1 ? (
                      <Tag color="success">正常</Tag>
                    ) : (
                      <Tag>停用</Tag>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="备注" span={2}>
                    {contact.remark || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间" span={2}>
                    {contact.created_at}
                  </Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'attachments',
              label: '附件',
              children: (
                <AttachmentsPanel
                  bizType="CONTACT"
                  resourceId={contact.id}
                  uploadPerm="crm:contact:edit"
                  deletePerm="crm:contact:edit"
                />
              ),
            },
          ]}
        />
      )}
      </Drawer>

      {/* 写邮件 */}
      <MailComposeModal
        open={mailOpen}
        onClose={() => setMailOpen(false)}
        defaultTo={contact?.email || ''}
        defaultToName={contact?.name}
      />
    </>
  )
}
