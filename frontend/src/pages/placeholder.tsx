import React from 'react';
import { Result, Button } from 'antd';
import { history } from '@umijs/max';

const PlaceholderPage: React.FC = () => {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <Result
        status="info"
        title="功能开发中"
        subTitle="该模块正在开发中，敬请期待"
        extra={
          <Button type="primary" onClick={() => history.back()}>
            返回上一页
          </Button>
        }
      />
    </div>
  );
};

export default PlaceholderPage;
