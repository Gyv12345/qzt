import { useEffect, useRef, useState, useCallback } from 'react'

export interface SSEMessage {
  event: string
  title: string
  body: string
  path?: string
}

export interface UseSSEOptions {
  /** 除 message 外需要投递的事件名(如 im_message);命中事件不进入 messages 队列 */
  events?: string[]
  /** 命中 events 的自定义事件回调(event 为事件名,data 为原始字符串) */
  onEvent?: (event: string, data: string) => void
}

/**
 * SSE 客户端 hook。
 *
 * 用 fetch + ReadableStream 实现(不用 EventSource,因为要带 Authorization header)。
 * 自动重连(断线 3 秒后重试)。
 *
 * 事件分发约定:
 * - `event: message`(站内信默认通道)→ 解析为 SSEMessage 进入 messages 队列(原有行为);
 * - options.events 列出的自定义事件(如 im_message)→ 原样经 onEvent 回调投递,不进 messages,
 *   载荷结构由调用方自行解析(与 SSEMessage 不同构,不能混用同一队列)。
 */
export function useSSE(url: string, options?: UseSSEOptions) {
  const [messages, setMessages] = useState<SSEMessage[]>([])
  const [connected, setConnected] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // options 存 ref:调用方常以内联字面量传参,若进依赖会导致每次渲染重连
  const extraEventsRef = useRef(options?.events)
  const onEventRef = useRef(options?.onEvent)
  extraEventsRef.current = options?.events
  onEventRef.current = options?.onEvent

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
            } else if (data && extraEventsRef.current?.includes(eventType)) {
              onEventRef.current?.(eventType, data)
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
