import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Modal, Tour } from 'antd'
import type { TourStepProps } from 'antd'
import { pageGuides } from '../../guides'
import type { PageGuide } from '../../guides'
import { useAuthStore } from '../../stores/auth'
import { useTourStore } from '../../stores/tour'

export interface GuideContextValue {
  /** 当前页面通过 usePageGuide 声明的 guideKey */
  pageKey: string
  /** 页面挂载时注册自己(由 usePageGuide 调用,页面勿直接用) */
  setPageKey: (key: string) => void
  /** 手动触发某个向导(如顶栏「?」) */
  startTour: (key: string) => void
  /** 打开某向导的帮助弹窗(如页内帮助按钮) */
  openHelp: (key: string) => void
  /** 清空「已看过」,之后所有引导恢复自动弹 */
  resetAll: () => void
}

export const GuideContext = createContext<GuideContextValue | null>(null)

/** 页面里获取向导上下文(一般用 usePageGuide,不要直接用这个) */
export function useGuide(): GuideContextValue {
  const ctx = useContext(GuideContext)
  if (!ctx) throw new Error('useGuide 必须在 GuideProvider 内使用')
  return ctx
}

/** 过滤掉当前 DOM 中不存在的步骤(如无权限按钮未渲染),避免 Tour 空挂 */
function filterVisibleSteps(guide: PageGuide): TourStepProps[] {
  return guide.tour
    .filter((step) => document.querySelector(step.selector))
    .map((step) => ({
      selector: step.selector,
      title: step.title,
      description: step.description,
    }))
}

/**
 * 向导运行核心:受控渲染单个 antd Tour + 一个帮助 Modal。
 * 自动触发:登录后首次弹 global;之后进入带向导的页面且未看过时弹本页向导。
 */
export function GuideProvider({ children }: { children: ReactNode }) {
  const [pageKey, setPageKey] = useState('')
  const [tourKey, setTourKey] = useState<string | null>(null)
  const [helpKey, setHelpKey] = useState<string | null>(null)

  const userLoaded = useAuthStore((s) => s.userLoaded)
  const seen = useTourStore((s) => s.seen)
  const markSeen = useTourStore((s) => s.markSeen)
  const resetStore = useTourStore((s) => s.resetAll)

  const tourGuide = tourKey ? pageGuides[tourKey] : undefined
  const helpGuide = helpKey ? pageGuides[helpKey] : undefined

  const startTour = useCallback((key: string) => {
    const guide = pageGuides[key]
    if (!guide || guide.tour.length === 0) return
    setTourKey(key)
  }, [])

  const openHelp = useCallback((key: string) => {
    if (pageGuides[key]?.help.length) setHelpKey(key)
  }, [])

  const resetAll = useCallback(() => {
    resetStore()
  }, [resetStore])

  // 登录信息就绪后,首次弹全局布局向导
  const globalFired = useRef(false)
  useEffect(() => {
    if (!userLoaded || globalFired.current) return
    globalFired.current = true
    if (!seen['global']) startTour('global')
    // 仅依赖 userLoaded;seen 读取一次用于首次判断,避免看过后重弹
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoaded])

  // 进入带向导的页面且未看过 → 自动弹本页向导
  useEffect(() => {
    if (!pageKey) return
    const guide = pageGuides[pageKey]
    if (guide && guide.tour.length > 0 && !seen[pageKey]) {
      // 等页面元素渲染完(懒加载 + ProTable 工具栏)再定位
      const timer = window.setTimeout(() => startTour(pageKey), 600)
      return () => window.clearTimeout(timer)
    }
    // seen 变化(如 resetAll)后切页/重进需要重新判断,故依赖 seen
  }, [pageKey, seen, startTour])

  const ctx = useMemo(
    () => ({ pageKey, setPageKey, startTour, openHelp, resetAll }),
    [pageKey, startTour, openHelp, resetAll],
  )

  const tourSteps = useMemo(() => (tourGuide ? filterVisibleSteps(tourGuide) : []), [tourGuide])

  return (
    <GuideContext.Provider value={ctx}>
      {children}
      <Tour
        open={!!tourGuide && tourSteps.length > 0}
        steps={tourSteps}
        onClose={() => {
          if (tourKey) markSeen(tourKey)
          setTourKey(null)
        }}
        onFinish={() => {
          if (tourKey) markSeen(tourKey)
          setTourKey(null)
        }}
      />
      <Modal
        open={!!helpGuide}
        title={helpGuide ? `${helpGuide.title} · 使用帮助` : ''}
        footer={null}
        width={560}
        onCancel={() => setHelpKey(null)}
      >
        {helpGuide?.help.map((section) => (
          <div key={section.title} style={{ marginBottom: 16 }}>
            <h4 style={{ marginBottom: 8 }}>{section.title}</h4>
            {section.body}
          </div>
        ))}
      </Modal>
    </GuideContext.Provider>
  )
}
