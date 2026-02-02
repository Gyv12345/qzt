import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';

const { Option } = Select;
const { TextArea } = Input;

interface CustomerModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  currentCustomer?: any;
}

const CustomerModal: React.FC<CustomerModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  currentCustomer,
}) => {
  const [form] = Form.useForm();
  const isEdit = !!currentCustomer;

  useEffect(() => {
    if (visible) {
      if (currentCustomer) {
        form.setFieldsValue({
          ...currentCustomer,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, currentCustomer, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { createCustomer, updateCustomer } = await import('@/services/customer');

      if (isEdit) {
        await updateCustomer(currentCustomer.id, values);
        message.success('更新成功');
      } else {
        await createCustomer(values);
        message.success('创建成功');
      }
      onSuccess();
    } catch (error) {
      message.error(isEdit ? '更新失败' : '创建失败');
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑客户' : '新建客户'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="客户名称"
          name="name"
          rules={[{ required: true, message: '请输入客户名称' }]}
        >
          <Input placeholder="请输入客户名称" />
        </Form.Item>

        <Form.Item
          label="联系人姓名"
          name="contactName"
          rules={[{ required: true, message: '请输入联系人姓名' }]}
        >
          <Input placeholder="请输入联系人姓名" />
        </Form.Item>

        <Form.Item
          label="联系电话"
          name="contactPhone"
          rules={[
            { required: true, message: '请输入联系电话' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
          ]}
        >
          <Input placeholder="请输入联系电话" />
        </Form.Item>

        <Form.Item label="联系邮箱" name="contactEmail">
          <Input placeholder="请输入联系邮箱" />
        </Form.Item>

        <Form.Item label="公司名称" name="companyName">
          <Input placeholder="请输入公司名称" />
        </Form.Item>

        <Form.Item label="客户等级" name="customerLevel" initialValue={0}>
          <Select>
            <Option value={0}>潜在</Option>
            <Option value={1}>意向</Option>
            <Option value={2}>正式</Option>
            <Option value={3}>VIP</Option>
          </Select>
        </Form.Item>

        <Form.Item label="来源渠道" name="sourceChannel">
          <Select placeholder="请选择来源渠道" allowClear>
            <Option value={1}>线上推广</Option>
            <Option value={2}>转介绍</Option>
            <Option value={3}>线下活动</Option>
            <Option value={4}>其他</Option>
          </Select>
        </Form.Item>

        <Form.Item label="备注" name="remark">
          <TextArea rows={4} placeholder="请输入备注" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CustomerModal;
