import { useEffect, useRef } from 'react'
import { notification } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useSSE } from '../../hooks/useSSE'
import { useNotificationStore } from '../../stores/notification'

/**
 * 全局通知处理器。
 * - 用 SSE 监听实时消息
 * - 页面在前台:antd notification 右下角弹窗
 * - 页面在后台:调用浏览器系统通知(Windows/macOS 通知中心)
 * - 点击通知跳转到对应业务页面
 * - 同时更新铃铛未读计数
 */
export default function NotificationHandler() {
  const { messages, clearMessages } = useSSE('/prod-api/oa/messages/stream')
  const navigate = useNavigate()
  const { increment } = useNotificationStore()
  const processedRef = useRef<boolean[]>([])

  // 请求浏览器通知权限
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // 处理新消息
  useEffect(() => {
    if (messages.length === 0) return

    // 只处理新增的消息(基于索引)
    const newMessages = messages.filter((_, idx) => !processedRef.current[idx])
    if (newMessages.length === 0) return

    newMessages.forEach((msg) => {
      // 铃铛 +1
      increment()

      const isBackground = document.hidden

      if (isBackground && 'Notification' in window && Notification.permission === 'granted') {
        // 页面在后台:用系统通知
        const notif = new Notification(msg.title, {
          body: msg.body,
          icon: '/favicon.ico',
          tag: msg.title,
        })
        notif.onclick = () => {
          window.focus()
          if (msg.path) navigate(msg.path)
          notif.close()
        }
      } else {
        // 页面在前台:用 antd notification 右下角弹窗
        const notifKey = `msg-${Date.now()}`
        notification.info({
          key: notifKey,
          message: msg.title,
          description: msg.body,
          placement: 'bottomRight',
          duration: 4.5,
          onClick: () => {
            if (msg.path) navigate(msg.path)
          },
        })
      }
    })

    // 标记已处理
    processedRef.current = new Array(messages.length).fill(true)

    // 清空已处理的消息队列,避免内存增长
    setTimeout(() => {
      clearMessages()
      processedRef.current = []
    }, 100)
  }, [messages, navigate, increment, clearMessages])

  return null
}
