import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { FollowRecord } from '@/types'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select

export const FollowRecordListPage = () => {
  const [followRecords, setFollowRecords] = useState<FollowRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FollowRecord | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchFollowRecords()
  }, [])

  const fetchFollowRecords = async () => {
    setLoading(true)
    try {
      // TODO: 调用实际的 API
      // const response = await fetch('/api/follow-records')
      // const data = await response.json()
      // setFollowRecords(data)

      // 模拟数据
      setFollowRecords([
        {
          id: '1',
          customerId: 'cust-001',
          customerName: '示例客户',
          type: 1,
          content: '客户反馈产品使用情况良好',
          nextTime: '2026-02-05',
          createdAt: '2026-02-01',
          userId: 'user-001',
          userName: '张三',
        },
      ])
    } catch (error) {
      message.error('获取跟进记录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingRecord(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: FollowRecord) => {
    setEditingRecord(record)
    form.setFieldsValue({
      ...record,
      nextTime: record.nextTime ? dayjs(record.nextTime) : undefined,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条跟进记录吗？',
      onOk: async () => {
        try {
          // TODO: 调用实际的 API
          // await fetch(`/api/follow-records/${id}`, { method: 'DELETE' })
          message.success('删除成功')
          fetchFollowRecords()
        } catch (error) {
          message.error('删除失败')
        }
      },
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const submitData = {
        ...values,
        nextTime: values.nextTime ? values.nextTime.format('YYYY-MM-DD') : undefined,
      }

      if (editingRecord) {
        // TODO: 调用更新 API
        // await fetch(`/api/follow-records/${editingRecord.id}`, {
        //   method: 'PATCH',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(submitData),
        // })
        message.success('更新成功')
      } else {
        // TODO: 调用创建 API
        // await fetch('/api/follow-records', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(submitData),
        // })
        message.success('创建成功')
      }

      setModalVisible(false)
      fetchFollowRecords()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const getFollowTypeTag = (type: number) => {
    const typeMap: Record<number, { text: string; color: string }> = {
      1: { text: '电话', color: 'blue' },
      2: { text: '微信', color: 'green' },
      3: { text: '上门', color: 'orange' },
      4: { text: '邮件', color: 'purple' },
      5: { text: '其他', color: 'default' },
    }
    const { text, color } = typeMap[type] || typeMap[5]
    return <Tag color={color}>{text}</Tag>
  }

  const columns = [
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: '跟进类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: number) => getFollowTypeTag(type),
    },
    {
      title: '跟进内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '跟进人',
      dataIndex: 'userName',
      key: 'userName',
    },
    {
      title: '下次跟进时间',
      dataIndex: 'nextTime',
      key: 'nextTime',
      render: (date: string) => date || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: FollowRecord) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">跟进记录</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建跟进记录
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={followRecords}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      <Modal
        title={editingRecord ? '编辑跟进记录' : '新建跟进记录'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="客户"
            name="customerId"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <Select placeholder="请选择客户" showSearch>
              {/* TODO: 从客户列表加载 */}
              <Option value="cust-001">示例客户</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="跟进类型"
            name="type"
            rules={[{ required: true, message: '请选择跟进类型' }]}
          >
            <Select placeholder="请选择跟进类型">
              <Option value={1}>电话</Option>
              <Option value={2}>微信</Option>
              <Option value={3}>上门</Option>
              <Option value={4}>邮件</Option>
              <Option value={5}>其他</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="跟进内容"
            name="content"
            rules={[{ required: true, message: '请输入跟进内容' }]}
          >
            <TextArea rows={4} placeholder="请输入跟进内容" />
          </Form.Item>

          <Form.Item label="下次跟进时间" name="nextTime">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="图片" name="images">
            <Input placeholder="请输入图片URL（JSON格式）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
