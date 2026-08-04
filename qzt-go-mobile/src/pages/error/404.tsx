import { Button, ErrorBlock } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div style={{ paddingTop: '25vh' }}>
      <ErrorBlock status="empty" title="页面不存在" description="您访问的页面走丢了" />
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Button color="primary" onClick={() => navigate('/', { replace: true })}>
          返回首页
        </Button>
      </div>
    </div>
  )
}
