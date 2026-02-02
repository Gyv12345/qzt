import React, { useState, useEffect } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Tabs, message, Spin } from 'antd';
import { useParams, history } from '@umijs/max';
import { getCustomerDetail } from '@/services/customer';
import CustomerInfoCard from './components/CustomerInfoCard';
import FollowRecordTimeline from './components/FollowRecordTimeline';

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<any>(null);

  const fetchCustomerDetail = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const data = await getCustomerDetail(id);
      setCustomer(data);
    } catch (error) {
      message.error('获取客户详情失败');
      history.push('/customer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetail();
  }, [id]);

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  if (!customer) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          客户不存在
        </div>
      </PageContainer>
    );
  }

  const levelMap = {
    0: { text: '潜在', color: 'default' },
    1: { text: '意向', color: 'blue' },
    2: { text: '正式', color: 'green' },
    3: { text: 'VIP', color: 'gold' },
  };
  const level = levelMap[customer.customerLevel] || levelMap[0];

  return (
    <PageContainer
      header={{
        title: customer.name,
        subTitle: `跟进人: ${customer.followUser?.name || '-'}`,
        onBack: () => history.push('/customer'),
      }}
    >
      <div style={{ display: 'flex', gap: 16 }}>
        {/* 左侧: 客户信息卡片 */}
        <div style={{ width: 300 }}>
          <CustomerInfoCard customer={customer} />
        </div>

        {/* 右侧: 标签页 */}
        <div style={{ flex: 1 }}>
          <ProCard>
            <Tabs
              defaultActiveKey="follow"
              items={[
                {
                  key: 'follow',
                  label: '跟进记录',
                  children: <FollowRecordTimeline customerId={customer.id} />,
                },
                {
                  key: 'contract',
                  label: '合同信息',
                  children: (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: '#999' }}>
                      合同信息功能开发中...
                    </div>
                  ),
                },
                {
                  key: 'invoice',
                  label: '开票记录',
                  children: (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: '#999' }}>
                      开票记录功能开发中...
                    </div>
                  ),
                },
                {
                  key: 'team',
                  label: '服务团队',
                  children: (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: '#999' }}>
                      服务团队功能开发中...
                    </div>
                  ),
                },
              ]}
            />
          </ProCard>
        </div>
      </div>
    </PageContainer>
  );
};

export default CustomerDetail;
