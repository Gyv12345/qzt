import { useEffect, useRef, useState, useCallback } from 'react'

export interface SSEMessage {
  event: string
  title: string
  body: string
  path?: string
}

/**
 * SSE 客户端 hook (移动端版)。
 * 用 fetch + ReadableStream 实现(不用 EventSource,因为要带 Authorization header)。
 * 自动重连(断线 5 秒后重试)。
 */
export function useSSE(url: string) {
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null)
  const [connected, setConnected] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    let token = ''
    try {
      const raw = localStorage.getItem('qzt-go-mobile:tokens')
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
        if (!response.ok || !response.body) throw new Error('SSE failed')
        setConnected(true)

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() || ''

          for (const part of parts) {
            const lines = part.split('\n')
            let eventType = ''
            let data = ''
            for (const line of lines) {
              if (line.startsWith('event:')) eventType = line.slice(6).trim()
              else if (line.startsWith('data:')) data = line.slice(5).trim()
            }
            if (eventType === 'message' && data) {
              try {
                setLastMessage(JSON.parse(data) as SSEMessage)
              } catch {
                // ignore
              }
            }
          }
        }
        setConnected(false)
        retryTimer.current = setTimeout(connect, 5000)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setConnected(false)
        retryTimer.current = setTimeout(connect, 5000)
      })
  }, [url])

  useEffect(() => {
    connect()
    return () => {
      abortRef.current?.abort()
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [connect])

  return { lastMessage, connected }
}
