import { Card, Row, Col, Statistic } from 'antd';
import { UserOutlined, TeamOutlined, FileTextOutlined, DollarOutlined } from '@ant-design/icons';

const Dashboard: React.FC = () => {
  return (
    <div className="page-container">
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="客户总数"
              value={0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="跟进记录"
              value={0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="合同数量"
              value={0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="收款金额"
              value={0}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="欢迎使用企账通SCRM系统" style={{ marginTop: 24 }}>
        <p>系统正在建设中，敬请期待...</p>
      </Card>
    </div>
  );
};

export default Dashboard;
