import React from "react";
import { Card, Row, Col, Statistic } from "antd";
import {
  UserOutlined,
  FileTextOutlined,
  DollarOutlined,
  ShoppingOutlined,
  TrendingUpOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

export const StatisticsPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">统计分析</h1>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="客户总数"
              value={1128}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="合同总数"
              value={93}
              suffix="份"
              prefix={<FileTextOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="合同金额"
              value={1128000}
              prefix="¥"
              precision={2}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="收款金额"
              value={856000}
              prefix="¥"
              precision={2}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="待收款"
              value={272000}
              prefix="¥"
              precision={2}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="产品总数"
              value={45}
              suffix="个"
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="本月新增客户"
              value={28}
              prefix={<TrendingUpOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8} xl={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="已完成跟进"
              value={156}
              suffix="次"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
