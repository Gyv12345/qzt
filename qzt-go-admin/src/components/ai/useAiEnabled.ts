import { useEffect, useState } from 'react'
import { aiGetModels } from '../../services/ai'

// AI 总开关(GET /api/ai/models 的 enabled)。内嵌在各业务页面的 AI 入口据此决定是否渲染:
// 开关关闭或接口不可用时入口不出现,页面其余部分不受影响。
// 结果在模块级缓存 5 分钟,避免每个入口各发一次请求;开关翻转后最多 5 分钟生效(刷新页面立即生效)。

const CACHE_TTL = 5 * 60 * 1000

let cached: { at: number; enabled: boolean } | null = null
let inflight: Promise<boolean> | null = null

function fetchEnabled(): Promise<boolean> {
  if (cached && Date.now() - cached.at < CACHE_TTL) return Promise.resolve(cached.enabled)
  if (!inflight) {
    inflight = aiGetModels()
      .then((m) => !!m?.enabled)
      .catch(() => false)
      .then((enabled) => {
        cached = { at: Date.now(), enabled }
        inflight = null
        return enabled
      })
  }
  return inflight
}

/** AI 总开关是否开启(默认 false,异步判定后更新) */
export function useAiEnabled(): boolean {
  const [enabled, setEnabled] = useState(cached?.enabled ?? false)

  useEffect(() => {
    let mounted = true
    fetchEnabled().then((v) => {
      if (mounted) setEnabled(v)
    })
    return () => {
      mounted = false
    }
  }, [])

  return enabled
}
