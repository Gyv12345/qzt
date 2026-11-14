import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Collapse, Space, Tag, Tooltip } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { getDeployStatus, runStaticDeploy } from '../services/deploy'
import type { DeployStatus, DeployTarget } from '../types/deploy'

/** 静态站发布目标中文名 */
const DEPLOY_TARGET_LABEL: Record<DeployTarget, string> = { cms: '官网' }

/** 静态站发布卡片:超管专用(perm 码仅约定,后端 Casbin 超管短路;普通角色无策略不可达)。
 *  targets 决定本卡展示哪些发布按钮与状态(官网设置页=['cms'],独立站站点配置页=['storefront']);
 *  构建全局单飞:任一目标在跑时所有按钮禁用。触发服务器异步重建,点击后 5 秒轮询状态/日志尾。 */
export default function StaticDeployCard({ targets }: { targets: DeployTarget[] }) {
  const { message } = App.useApp()
  const [status, setStatus] = useState<DeployStatus | null>(null)
  const [polling, setPolling] = useState(false)

  const refresh = useCallback(async () => {
    const res = await getDeployStatus()
    setStatus(res)
    return res
  }, [])

  // 进入页面拉一次;仅当有任务在跑才进入轮询
  useEffect(() => {
    refresh()
      .then((res) => {
        if (res.running) setPolling(true)
      })
      .catch(() => {
        /* 失败提示由 request 拦截器统一弹出 */
      })
  }, [refresh])

  // 5 秒轮询:发现无任务运行即停
  useEffect(() => {
    if (!polling) return
    const timer = setInterval(async () => {
      try {
        const res = await refresh()
        if (!res.running) setPolling(false)
      } catch {
        setPolling(false)
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [polling, refresh])

  const running = status?.running || ''

  const handleDeploy = async (t: DeployTarget) => {
    try {
      await runStaticDeploy(t)
      message.success(`${DEPLOY_TARGET_LABEL[t]}重建已开始,通常需数分钟,可展开下方日志观察进度`)
      setPolling(true)
      await refresh()
    } catch {
      /* 失败提示由 request 拦截器统一弹出 */
    }
  }

  // 状态面板只展示本卡声明的目标(全局单飞,running 提示保留全目标)
  const shown = (Object.keys(status?.last_per_target ?? {}) as DeployTarget[]).filter((t) => targets.includes(t))

  return (
    <Card
      title="静态站发布"
      extra={
        <Tooltip title="仅超级管理员可用:在服务器上重新执行构建脚本(npm install + next build + rsync 发布)并发布到静态托管目录,构建期间全局只允许一个任务">
          <QuestionCircleOutlined style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
        </Tooltip>
      }
    >
      <Space wrap>
        {targets.includes('cms') && (
          <Tooltip title="仅超级管理员可用;构建在服务器后台异步执行,请勿重复点击">
            <Button type="primary" disabled={!!running} loading={running === 'cms'} onClick={() => handleDeploy('cms')}>
              重新生成并发布官网
            </Button>
          </Tooltip>
        )}
        {running && <Tag color="processing">正在重建:{DEPLOY_TARGET_LABEL[running]} …</Tag>}
      </Space>
      {shown.map((t) => {
        const st = status?.last_per_target?.[t]
        if (!st) return null
        return (
          <div key={t} style={{ marginTop: 12 }}>
            <Space>
              <Tag color={st.status === 'success' ? 'green' : st.status === 'failed' ? 'red' : 'blue'}>
                {DEPLOY_TARGET_LABEL[t]}:{st.status === 'success' ? '上次发布成功' : st.status === 'failed' ? '上次发布失败' : '重建中'}
              </Tag>
              <span style={{ color: '#999', fontSize: 12 }}>开始 {st.started_at || '-'} · 结束 {st.finished_at || '进行中…'}</span>
            </Space>
            {(st.log_tail?.length ?? 0) > 0 && (
              <Collapse
                size="small"
                style={{ marginTop: 8 }}
                items={[
                  {
                    key: t,
                    label: '最近日志(末 30 行)',
                    children: (
                      <pre style={{ margin: 0, maxHeight: 260, overflow: 'auto', fontSize: 12, background: '#fafafa', padding: 8 }}>
                        {st.log_tail?.join('\n')}
                      </pre>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )
      })}
    </Card>
  )
}
