import React from 'react';
import { Card, Descriptions, Tag } from 'antd';

interface CustomerInfoCardProps {
  customer: any;
}

const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({ customer }) => {
  const levelMap = {
    0: { text: '潜在', color: 'default' },
    1: { text: '意向', color: 'blue' },
    2: { text: '正式', color: 'green' },
    3: { text: 'VIP', color: 'gold' },
  };
  const level = levelMap[customer.customerLevel] || levelMap[0];

  return (
    <Card title="客户信息">
      <Descriptions column={1} size="small">
        <Descriptions.Item label="客户名称">{customer.name}</Descriptions.Item>
        <Descriptions.Item label="联系人">{customer.contactName}</Descriptions.Item>
        <Descriptions.Item label="联系电话">{customer.contactPhone}</Descriptions.Item>
        {customer.contactEmail && (
          <Descriptions.Item label="联系邮箱">{customer.contactEmail}</Descriptions.Item>
        )}
        {customer.companyName && (
          <Descriptions.Item label="公司名称">{customer.companyName}</Descriptions.Item>
        )}
        <Descriptions.Item label="客户等级">
          <Tag color={level.color}>{level.text}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="跟进人">{customer.followUser?.name || '-'}</Descriptions.Item>
        {customer.sourceChannel && (
          <Descriptions.Item label="来源渠道">
            {customer.sourceChannel === 1 && '线上推广'}
            {customer.sourceChannel === 2 && '转介绍'}
            {customer.sourceChannel === 3 && '线下活动'}
            {customer.sourceChannel === 4 && '其他'}
          </Descriptions.Item>
        )}
        {customer.address && (
          <Descriptions.Item label="地址">{customer.address}</Descriptions.Item>
        )}
        {customer.remark && (
          <Descriptions.Item label="备注">{customer.remark}</Descriptions.Item>
        )}
        <Descriptions.Item label="创建时间">
          {new Date(customer.createdAt).toLocaleString('zh-CN')}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default CustomerInfoCard;
