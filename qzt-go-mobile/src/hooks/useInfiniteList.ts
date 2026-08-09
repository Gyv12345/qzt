import { useCallback, useEffect, useRef, useState } from 'react'

interface PageResult<T> {
  list: T[]
  total: number
}

interface PageParams {
  page?: number
  page_size?: number
}

/**
 * 移动端无限滚动列表分页 hook。
 *
 * 用法:
 *   const { list, hasMore, loadMore, refresh, loading } =
 *     useInfiniteList<CrmCustomer>(fetchPage, { page_size: 20 })
 *
 *   <PullToRefresh onRefresh={refresh}><List>{list.map(...)}</List>
 *     <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
 *   </PullToRefresh>
 *
 * @param fetcher 接收 { page, page_size, ...extra },返回 { list, total }
 * @param defaults 默认 page_size
 */
export function useInfiniteList<T>(
  fetcher: (params: Required<PageParams>) => Promise<PageResult<T>>,
  defaults: { page_size?: number } = {},
) {
  const pageSize = defaults.page_size ?? 20
  const [list, setList] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const pageRef = useRef(0)
  const loadedRef = useRef(false)

  // hasMore 在首次加载完成前保持 true,确保 InfiniteScroll 能触发首次 loadMore
  const hasMore = !loadedRef.current || list.length < total

  const loadMore = useCallback(async () => {
    if (loading || (loadedRef.current && list.length >= total)) return
    setLoading(true)
    try {
      const next = pageRef.current + 1
      const res = await fetcher({ page: next, page_size: pageSize })
      pageRef.current = next
      setTotal(res?.total ?? 0)
      setList((prev) => (next === 1 ? (res?.list ?? []) : [...prev, ...(res?.list ?? [])]))
      loadedRef.current = true
    } catch (err) {
      // 加载失败时不设置 loadedRef,允许 InfiniteScroll 重试
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetcher, loading, list.length, total, pageSize])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetcher({ page: 1, page_size: pageSize })
      pageRef.current = 1
      setTotal(res?.total ?? 0)
      setList(res?.list ?? [])
      loadedRef.current = true
    } finally {
      setLoading(false)
    }
  }, [fetcher, pageSize])

  // 挂载时自动加载首页(不依赖 InfiniteScroll 的 IntersectionObserver)
  useEffect(() => {
    loadMore().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { list, total, loading, hasMore, loadMore, refresh }
}
