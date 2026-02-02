import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getCustomers, deleteCustomer } from '@/services/customer';
import { history } from '@umijs/max';
import CustomerModal from './components/CustomerModal';

const CustomerList: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<any>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns: ProColumns<any>[] = [
    {
      title: '客户名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '联系人',
      dataIndex: 'contactName',
      key: 'contactName',
      width: 100,
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      key: 'contactPhone',
      width: 120,
    },
    {
      title: '公司名称',
      dataIndex: 'companyName',
      key: 'companyName',
      width: 150,
      hideInSearch: true,
    },
    {
      title: '客户等级',
      dataIndex: 'customerLevel',
      key: 'customerLevel',
      width: 100,
      valueType: 'select',
      valueEnum: {
        0: { text: '潜在', status: 'Default' },
        1: { text: '意向', status: 'Processing' },
        2: { text: '正式', status: 'Success' },
        3: { text: 'VIP', status: 'Error' },
      },
      render: (_, record) => {
        const levelConfig = {
          0: {
            text: '潜在',
            bgColor: '#F1F5F9',
            textColor: '#64748B',
            borderColor: '#E2E8F0',
          },
          1: {
            text: '意向',
            bgColor: '#DBEAFE',
            textColor: '#0369A1',
            borderColor: '#BFDBFE',
          },
          2: {
            text: '正式',
            bgColor: '#D1FAE5',
            textColor: '#059669',
            borderColor: '#A7F3D0',
          },
          3: {
            text: 'VIP',
            bgColor: '#FEF3C7',
            textColor: '#D97706',
            borderColor: '#FDE68A',
          },
        };
        const config = levelConfig[record.customerLevel] || levelConfig[0];
        return (
          <Tag
            style={{
              margin: 0,
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: config.bgColor,
              color: config.textColor,
              border: `1px solid ${config.borderColor}`,
            }}
          >
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '跟进人',
      dataIndex: ['followUser', 'name'],
      key: 'followUserId',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => [
        <a key="detail" onClick={() => history.push(`/customer/${record.id}`)}>
          详情
        </a>,
        <a key="edit" onClick={() => { setCurrentCustomer(record); setModalVisible(true); }}>
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确定要删除这个客户吗?"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <a style={{ color: 'red' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <div style={{ padding: 0, margin: 0 }}>
      <ProTable<any>
        headerTitle={
          <span style={{ fontSize: 16, fontWeight: 600, color: '#020617' }}>
            客户列表
          </span>
        }
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 80,
          style: {
            background: '#FFFFFF',
            borderRadius: 12,
            padding: '16px 24px',
            marginBottom: 16,
          },
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            size="large"
            onClick={() => {
              setCurrentCustomer(null);
              setModalVisible(true);
            }}
            style={{
              borderRadius: 8,
              height: 40,
              fontWeight: 500,
              boxShadow: '0 1px 2px rgba(3, 105, 161, 0.2)',
            }}
          >
            <PlusOutlined /> 新建客户
          </Button>,
        ]}
        request={async (params, sort) => {
          const { current, pageSize, ...rest } = params;
          const res = await getCustomers({
            page: current,
            pageSize,
            ...rest,
          });
          return {
            data: res.data,
            success: true,
            total: res.total,
          };
        }}
        columns={columns}
        rowSelection={{}}
        scroll={{ x: 1200 }}
        options={{
          density: false,
          fullScreen: false,
          reload: true,
          setting: true,
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      />

      <CustomerModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setCurrentCustomer(null);
        }}
        onSuccess={() => {
          setModalVisible(false);
          setCurrentCustomer(null);
          actionRef.current?.reload();
        }}
        currentCustomer={currentCustomer}
      />
    </div>
  );
};

export default CustomerList;
