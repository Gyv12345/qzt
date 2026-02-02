import { useState } from 'react';
import { Button, Form, Input, message } from 'antd';
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
      <div className={styles.leftSection}>
        <div className={styles.brandSection}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>Q</div>
            <span className={styles.logoText}>企账通 SCRM</span>
          </div>
          <div className={styles.brandContent}>
            <h1 className={styles.brandTitle}>
              智能客户关系管理系统
            </h1>
            <p className={styles.brandSubtitle}>
              为企业打造的高效客户管理平台
            </p>
            <div className={styles.features}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>📊</div>
                <div className={styles.featureText}>数据分析</div>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>👥</div>
                <div className={styles.featureText}>客户管理</div>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>🎯</div>
                <div className={styles.featureText}>精准营销</div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.copyright}>
          © 2026 企账通 SCRM. All rights reserved.
        </div>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>登录系统</h2>
            <p className={styles.formSubtitle}>欢迎回来,请登录您的账户</p>
          </div>

          <Form
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              label="用户名"
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入用户名"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
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
                className={styles.submitButton}
              >
                登录
              </Button>
            </Form.Item>
          </Form>

          <div className={styles.formFooter}>
            <p className={styles.hintText}>
              忘记密码? <a href="#">联系管理员</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
