import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { App, Alert, Button, Card, Input, Result, Spin, Typography } from 'antd'
import { DownloadOutlined, FileOutlined } from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import { downloadShare, getShareMeta, shareErrMsg } from '../../services/cloudShare'
import type { CloudShareMeta } from '../../types/cloud'

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '-'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

const wrapStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f5f5f5',
  padding: 24,
}

const cardStyle: CSSProperties = { width: 420, maxWidth: '100%' }

type Stage = 'loading' | 'invalid' | 'ready'

/** 公开领取页:免登录,按 token 查看分享并获取下载链接 */
export default function ShareReceive() {
  const { token = '' } = useParams<{ token: string }>()
  const { message } = App.useApp()
  const [stage, setStage] = useState<Stage>('loading')
  const [meta, setMeta] = useState<CloudShareMeta | null>(null)
  const [errText, setErrText] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dlUrl, setDlUrl] = useState('')
  const [dlErr, setDlErr] = useState('')

  const loadMeta = useCallback(async () => {
    setStage('loading')
    setMeta(null)
    setErrText('')
    setDlUrl('')
    setDlErr('')
    try {
      const res = await getShareMeta(token)
      setMeta(res)
      setStage('ready')
    } catch (e) {
      setErrText(shareErrMsg(e, '分享不存在或已失效', '访问过于频繁,请稍后再试'))
      setStage('invalid')
    }
  }, [token])

  useEffect(() => { loadMeta() }, [loadMeta])

  const handleDownload = async () => {
    if (meta?.has_code && !/^[A-Za-z0-9]{4,12}$/.test(code.trim())) {
      message.error('请输入 4-12 位字母或数字提取码')
      return
    }
    setSubmitting(true)
    setDlErr('')
    try {
      const res = await downloadShare(token, { code: code.trim() || undefined })
      setDlUrl(res.download_url)
      // 触发浏览器下载(当前页不跳走)
      window.location.href = res.download_url
    } catch (e) {
      setDlErr(shareErrMsg(e, '获取下载链接失败,请稍后重试'))
    } finally {
      setSubmitting(false)
    }
  }

  if (stage === 'loading') {
    return (
      <div style={wrapStyle}>
        <Spin size="large" />
      </div>
    )
  }

  if (stage === 'invalid') {
    return (
      <div style={wrapStyle}>
        <Card style={cardStyle}>
          <Result
            status="warning"
            title="无法访问该分享"
            subTitle={errText}
            extra={<Button type="primary" onClick={loadMeta}>重新加载</Button>}
          />
        </Card>
      </div>
    )
  }

  return (
    <div style={wrapStyle}>
      <Card style={cardStyle}>
        <div style={{ textAlign: 'center' }}>
          <FileOutlined style={{ fontSize: 48, color: '#8c8c8c' }} />
          <Typography.Title level={4} style={{ marginTop: 12, marginBottom: 0, wordBreak: 'break-all' }}>
            {meta?.file_name}
          </Typography.Title>
        </div>
        <div style={{ display: 'grid', gap: 6, color: '#666', margin: '16px 0 20px' }}>
          <span>大小:{formatSize(meta?.size || 0)}</span>
          <span>有效期至:{(meta?.expire_at || '').slice(0, 16)}</span>
          <span>已被下载 {meta?.download_count ?? 0} 次</span>
        </div>

        {meta?.has_code && !dlUrl && (
          <Input
            placeholder="请输入提取码"
            maxLength={12}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onPressEnter={handleDownload}
            style={{ marginBottom: 12 }}
          />
        )}
        {!dlUrl && (
          <Button
            type="primary"
            block
            size="large"
            icon={<DownloadOutlined />}
            loading={submitting}
            onClick={handleDownload}
          >
            {meta?.has_code ? '验证并获取下载链接' : '获取下载链接'}
          </Button>
        )}
        {dlErr && <Alert type="error" showIcon style={{ marginTop: 12 }} message={dlErr} />}
        {dlUrl && (
          <Alert
            type="success"
            showIcon
            style={{ marginTop: 12 }}
            message="下载已开始"
            description={<a href={dlUrl}>若未自动开始,请点此重试</a>}
          />
        )}
      </Card>
    </div>
  )
}
