import React, { useState, useEffect } from 'react';
import { Timeline, Button, Modal, Form, Input, Select, DatePicker, message, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getFollowRecords, createFollowRecord } from '@/services/follow-record';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface FollowRecordTimelineProps {
  customerId: string;
}

const FollowRecordTimeline: React.FC<FollowRecordTimelineProps> = ({ customerId }) => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await getFollowRecords(customerId);
      setRecords(data || []);
    } catch (error) {
      message.error('获取跟进记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [customerId]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();

      const recordData = {
        customerId,
        content: values.content,
        type: values.type,
        nextTime: values.nextTime ? values.nextTime.toISOString() : undefined,
      };

      await createFollowRecord(recordData);
      message.success('添加成功');
      setModalVisible(false);
      form.resetFields();
      fetchRecords();
    } catch (error) {
      message.error('添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setModalVisible(false);
    form.resetFields();
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          添加跟进记录
        </Button>
      </div>

      {loading ? (
        <Timeline loading />
      ) : records.length === 0 ? (
        <Empty description="暂无跟进记录" />
      ) : (
        <Timeline>
          {records.map((record) => (
            <Timeline.Item key={record.id}>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  {record.user?.name || '-'}
                  <span style={{ fontWeight: 'normal', marginLeft: 8, color: '#999' }}>
                    {record.type === 1 && '电话'}
                    {record.type === 2 && '微信'}
                    {record.type === 3 && '上门'}
                    {record.type === 4 && '邮件'}
                    {record.type === 5 && '其他'}
                  </span>
                </div>
                <div style={{ marginTop: 4 }}>{record.content}</div>
                <div style={{ marginTop: 4, color: '#999', fontSize: 12 }}>
                  {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}
                  {record.nextTime && (
                    <span style={{ marginLeft: 16 }}>
                      下次跟进: {dayjs(record.nextTime).format('YYYY-MM-DD HH:mm')}
                    </span>
                  )}
                </div>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      )}

      <Modal
        title="添加跟进记录"
        open={modalVisible}
        onCancel={handleCancel}
        onOk={handleSubmit}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="跟进类型"
            name="type"
            initialValue={1}
            rules={[{ required: true, message: '请选择跟进类型' }]}
          >
            <Select>
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
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FollowRecordTimeline;
