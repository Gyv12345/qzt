import { Button, Result } from 'antd'
import { Link, useSearchParams } from 'react-router-dom'

/**
 * 企业微信绑定结果页。
 * 后端 GET /system/auth/wecom/bind-callback 完成绑定后 302 跳到这里:
 *   /auth/wecom/bind?result=success
 *   /auth/wecom/bind?result=failed&msg=xxx
 * 此页面仅展示结果,不发任何请求——绑定已在后端完成。
 */
export default function WecomBind() {
  const [searchParams] = useSearchParams()
  const result = searchParams.get('result')
  const msg = searchParams.get('msg') || ''

  if (result === 'success') {
    return (
      <Result
        status="success"
        title="企业微信绑定成功"
        subTitle="请在电脑端查看绑定状态"
        extra={
          <Link to="/">
            <Button type="primary">完成</Button>
          </Link>
        }
      />
    )
  }

  return (
    <Result
      status="error"
      title="企业微信绑定失败"
      subTitle={msg || '未知错误,请重新扫码'}
      extra={
        <Link to="/">
          <Button type="primary">回到首页</Button>
        </Link>
      }
    />
  )
}
