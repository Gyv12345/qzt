import { Tabs, Table, Button, Space, Modal, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { ColumnsType } from 'antd/es/table';

interface SystemConfig {
  key: string;
  configKey: string;
  configValue: string;
  description: string;
  updatedAt: string;
}

interface CommonPhrase {
  key: string;
  category: string;
  content: string;
  updatedAt: string;
}

interface PaymentAccount {
  key: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  accountType: string;
  status: string;
}
export function SystemPage() {
  const [activeTab, setActiveTab] = useState("config");

  const configColumns: ColumnsType<SystemConfig> = [
    { title: "配置键", dataIndex: "configKey", key: "configKey" },
    { title: "配置值", dataIndex: "configValue", key: "configValue" },
    { title: "说明", dataIndex: "description", key: "description" },
    { title: "更新时间", dataIndex: "updatedAt", key: "updatedAt" },
    {
      title: "操作",
      key: "action",
      render: () => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} size="small">编辑</Button>
        </Space>
      ),
    },
  ];

  const phraseColumns: ColumnsType<CommonPhrase> = [
    { title: "分类", dataIndex: "category", key: "category" },
    { title: "内容", dataIndex: "content", key: "content" },
    { title: "更新时间", dataIndex: "updatedAt", key: "updatedAt" },
    {
      title: "操作",
      key: "action",
      render: () => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} size="small">编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />} size="small">删除</Button>
        </Space>
      ),
    },
  ];
  const accountColumns: ColumnsType<PaymentAccount> = [
    { title: "账户名称", dataIndex: "accountName", key: "accountName" },
    { title: "账号", dataIndex: "accountNumber", key: "accountNumber" },
    { title: "开户行", dataIndex: "bankName", key: "bankName" },
    { title: "账户类型", dataIndex: "accountType", key: "accountType" },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <span style={{ color: status === "启用" ? "#52c41a" : "#ff4d4f" }}>{status}</span>
      ),
    },
    {
      title: "操作",
      key: "action",
      render: () => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} size="small">编辑</Button>
        </Space>
      ),
    },
  ];

