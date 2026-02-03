import { Tabs, Table, Button, Space } from 'antd';
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

const configData: SystemConfig[] = [
  {
    key: '1',
    configKey: 'system.name',
    configValue: '企账通',
    description: '系统名称',
    updatedAt: '2024-01-01 12:00:00',
  },
];

const phraseData: CommonPhrase[] = [
  {
    key: '1',
    category: '问候',
    content: '您好，请问有什么可以帮您？',
    updatedAt: '2024-01-01 12:00:00',
  },
];

const accountData: PaymentAccount[] = [
  {
    key: '1',
    accountName: '公司账户',
    accountNumber: '6222021234567890',
    bankName: '工商银行',
    accountType: '对公账户',
    status: '启用',
  },
];

export function SystemPage() {
  const [activeTab, setActiveTab] = useState('config');

  const configColumns: ColumnsType<SystemConfig> = [
    { title: '配置键', dataIndex: 'configKey', key: 'configKey' },
    { title: '配置值', dataIndex: 'configValue', key: 'configValue' },
    { title: '说明', dataIndex: 'description', key: 'description' },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt' },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} size="small">
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  const phraseColumns: ColumnsType<CommonPhrase> = [
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '内容', dataIndex: 'content', key: 'content' },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt' },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} size="small">
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} size="small">
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const accountColumns: ColumnsType<PaymentAccount> = [
    { title: '账户名称', dataIndex: 'accountName', key: 'accountName' },
    { title: '账号', dataIndex: 'accountNumber', key: 'accountNumber' },
    { title: '开户行', dataIndex: 'bankName', key: 'bankName' },
    { title: '账户类型', dataIndex: 'accountType', key: 'accountType' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span style={{ color: status === '启用' ? '#52c41a' : '#ff4d4f' }}>
          {status}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} size="small">
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'config',
      label: '系统配置',
      children: (
        <div className="p-4">
          <div className="mb-4">
            <Button type="primary" icon={<PlusOutlined />}>
              新增配置
            </Button>
          </div>
          <Table columns={configColumns} dataSource={configData} />
        </div>
      ),
    },
    {
      key: 'phrase',
      label: '常用语',
      children: (
        <div className="p-4">
          <div className="mb-4">
            <Button type="primary" icon={<PlusOutlined />}>
              新增常用语
            </Button>
          </div>
          <Table columns={phraseColumns} dataSource={phraseData} />
        </div>
      ),
    },
    {
      key: 'account',
      label: '收款账户',
      children: (
        <div className="p-4">
          <div className="mb-4">
            <Button type="primary" icon={<PlusOutlined />}>
              新增账户
            </Button>
          </div>
          <Table columns={accountColumns} dataSource={accountData} />
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">系统管理</h1>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </div>
  );
}
