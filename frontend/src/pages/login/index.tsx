import { useState } from 'react';
import { Button, Form, Input, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import styles from './index.less';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { setInitialState } = useModel('@@initialState');

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('userInfo', JSON.stringify(data.user));

        const initialState = await getInitialState();
        setInitialState(initialState);

        message.success('登录成功');
        history.push('/dashboard');
      } else {
        message.error(data.message || '登录失败');
      }
    } catch (error) {
      message.error('登录失败,请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.loginCard} title="企账通SCRM系统">
        <Form onFinish={onFinish} autoComplete="off">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
