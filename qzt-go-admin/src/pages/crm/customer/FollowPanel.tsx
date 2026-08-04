import { useEffect, useState } from 'react'
import { App, Button, DatePicker, Form, Input, Space, Timeline } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { ModalForm } from '@ant-design/pro-components'
import dayjs, { type Dayjs } from 'dayjs'
import DictSelect, { DictTag } from '../../../components/DictSelect'
import { createFollowRecord, getFollowTimeline } from '../../../services/crm'
import { useUserStore } from '../../../stores/users'
import type { CrmFollowRecord } from '../../../types/crm'

interface FollowFormValues {
  type: string
  content: string
  follow_time: Dayjs
}

/** 客户详情 - 跟进记录面板(时间线) */
export default function FollowPanel({ customerId }: { customerId: number }) {
  const { message } = App.useApp()
  const nickname = useUserStore((s) => s.nickname)
  const [records, setRecords] = useState<CrmFollowRecord[]>([])
  const [form] = Form.useForm<FollowFormValues>()
  const [modalOpen, setModalOpen] = useState(false)

  const load = async () => {
    const res = await getFollowTimeline('customer_id', customerId)
    setRecords([...res].sort((a, b) => b.follow_time.localeCompare(a.follow_time)))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  const openWrite = () => {
    form.resetFields()
    form.setFieldsValue({ follow_time: dayjs() })
    setModalOpen(true)
  }

  const handleSubmit = async (values: FollowFormValues) => {
    await createFollowRecord({
      type: values.type,
      content: values.content,
      follow_time: values.follow_time.format('YYYY-MM-DD HH:mm:ss'),
      customer_id: customerId,
    })
    message.success('跟进记录已创建')
    load()
    return true
  }

  return (
    <>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button type="primary" size="small" icon={<EditOutlined />} onClick={openWrite}>
          写跟进
        </Button>
      </div>
      {records.length ? (
        <Timeline
          items={records.map((r) => ({
            key: r.id,
            children: (
              <div>
                <Space size="small" wrap>
                  <DictTag code="FOLLOW_UP_TYPE" value={r.type} />
                  <span>{nickname(r.owner_id)}</span>
                  <span style={{ color: '#999' }}>{r.follow_time}</span>
                </Space>
                <div style={{ marginTop: 4 }}>{r.content}</div>
              </div>
            ),
          }))}
        />
      ) : (
        <div style={{ color: '#999', textAlign: 'center', padding: 24 }}>暂无跟进记录</div>
      )}
      <ModalForm<FollowFormValues>
        title="写跟进"
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={480}
      >
        <Form.Item
          name="type"
          label="跟进方式"
          rules={[{ required: true, message: '请选择跟进方式' }]}
        >
          <DictSelect code="FOLLOW_UP_TYPE" placeholder="选择跟进方式" />
        </Form.Item>
        <Form.Item
          name="content"
          label="跟进内容"
          rules={[{ required: true, message: '请输入跟进内容' }]}
        >
          <Input.TextArea rows={4} placeholder="记录本次沟通内容" />
        </Form.Item>
        <Form.Item
          name="follow_time"
          label="跟进时间"
          rules={[{ required: true, message: '请选择跟进时间' }]}
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
      </ModalForm>
    </>
  )
}
