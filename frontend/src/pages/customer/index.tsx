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
        const levelMap = {
          0: { text: '潜在', color: 'default' },
          1: { text: '意向', color: 'blue' },
          2: { text: '正式', color: 'green' },
          3: { text: 'VIP', color: 'gold' },
        };
        const level = levelMap[record.customerLevel] || levelMap[0];
        return <Tag color={level.color}>{level.text}</Tag>;
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
    <PageContainer>
      <ProTable<any>
        headerTitle="客户列表"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 80,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => { setCurrentCustomer(null); setModalVisible(true); }}
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
      />

      <CustomerModal
        visible={modalVisible}
        onCancel={() => { setModalVisible(false); setCurrentCustomer(null); }}
        onSuccess={() => { setModalVisible(false); setCurrentCustomer(null); actionRef.current?.reload(); }}
        currentCustomer={currentCustomer}
      />
    </PageContainer>
  );
};

export default CustomerList;
