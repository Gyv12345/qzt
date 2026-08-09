import { useEffect, useRef, useState, useCallback } from 'react'

export interface SSEMessage {
  event: string
  title: string
  body: string
  path?: string
}

/**
 * SSE 客户端 hook。
 *
 * 用 fetch + ReadableStream 实现(不用 EventSource,因为要带 Authorization header)。
 * 自动重连(断线 3 秒后重试)。
 */
export function useSSE(url: string) {
  const [messages, setMessages] = useState<SSEMessage[]>([])
  const [connected, setConnected] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    // 获取 token
    let token = ''
    try {
      const raw = localStorage.getItem('qzt-go-admin:tokens')
      if (raw) token = (JSON.parse(raw) as { accessToken?: string }).accessToken || ''
    } catch {
      // ignore
    }
    if (!token) return

    const controller = new AbortController()
    abortRef.current = controller

    fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok || !response.body) {
          throw new Error('SSE connection failed')
        }
        setConnected(true)

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // 按 \n\n 分割 SSE 事件块
          const parts = buffer.split('\n\n')
          buffer = parts.pop() || ''

          for (const part of parts) {
            const lines = part.split('\n')
            let eventType = ''
            let data = ''

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventType = line.slice(6).trim()
              } else if (line.startsWith('data:')) {
                data = line.slice(5).trim()
              }
              // 忽略注释行(: heartbeat)
            }

            if (eventType === 'message' && data) {
              try {
                const msg = JSON.parse(data) as SSEMessage
                setMessages((prev) => [...prev, msg])
              } catch {
                // ignore parse error
              }
            }
          }
        }

        // 流正常结束,尝试重连
        setConnected(false)
        retryTimer.current = setTimeout(connect, 3000)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setConnected(false)
        retryTimer.current = setTimeout(connect, 3000)
      })
  }, [url])

  useEffect(() => {
    connect()

    return () => {
      abortRef.current?.abort()
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [connect])

  /** 清除消息队列 */
  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, connected, clearMessages }
}
