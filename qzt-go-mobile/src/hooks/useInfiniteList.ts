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
 *     useInfiniteList<CrmCustomer>(fetchPage, { page_size: 20 }, [keyword])
 *
 *   <PullToRefresh onRefresh={refresh}><List>{list.map(...)}</List>
 *     <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
 *   </PullToRefresh>
 *
 * @param fetcher 接收 { page, page_size, ...extra },返回 { list, total }。
 *   hook 内部通过 ref 每次渲染同步持有最新 fetcher,refresh/loadMore 不会捕获过期闭包
 *   (修复 setState 后立即 refresh 用旧筛选值请求的 stale-closure 问题)。
 * @param defaults 默认 page_size
 * @param deps 可选的筛选依赖数组(如 [keyword, statusKey])。传入后 deps 变化时自动
 *   重置分页状态(list 清空、page 归零、loadedRef 重置)并用最新筛选值重新加载第一页,
 *   调用方在 onSearch/onTabChange 里只 setState 即可,无需手动调 refresh。
 *   注意:不要把「输入框受控值」这类每击键都变的 state 直接放进 deps(会逐键发请求),
 *   受控搜索框请用单独的「已提交搜索词」state 作为 dep。不传 deps 则保持旧行为:
 *   挂载加载首页 + 手动 refresh。
 */
export function useInfiniteList<T>(
  fetcher: (params: Required<PageParams>) => Promise<PageResult<T>>,
  defaults: { page_size?: number } = {},
  deps: unknown[] = [],
) {
  const pageSize = defaults.page_size ?? 20
  const [list, setList] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const pageRef = useRef(0)
  const loadedRef = useRef(false)
  // loading 的同步镜像:state 在同一渲染周期内可能读到过期值,防并发以 ref 为准
  const loadingRef = useRef(false)
  // 加载代数:重置(筛选变化/refresh)时 +1,用于丢弃重置前已在途的过期响应
  const epochRef = useRef(0)
  // 每次 render 同步更新,refresh/loadMore 一律通过它调用最新 fetcher
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  // hasMore 在首次加载完成前保持 true,确保 InfiniteScroll 能触发首次 loadMore
  const hasMore = !loadedRef.current || list.length < total

  // 加载指定页;page=1 时整体替换列表(用于刷新/筛选变化)
  const loadPage = useCallback(
    async (page: number, force = false) => {
      if (!force && loadingRef.current) return
      loadingRef.current = true
      setLoading(true)
      const epoch = epochRef.current
      try {
        const res = await fetcherRef.current({ page, page_size: pageSize })
        if (epoch !== epochRef.current) return // 期间已发生重置,丢弃过期结果
        pageRef.current = page
        setTotal(res?.total ?? 0)
        setList((prev) => (page === 1 ? (res?.list ?? []) : [...prev, ...(res?.list ?? [])]))
        loadedRef.current = true
      } finally {
        if (epoch === epochRef.current) {
          loadingRef.current = false
          setLoading(false)
        }
      }
    },
    [pageSize],
  )

  const loadMore = useCallback(async () => {
    if (loading || (loadedRef.current && list.length >= total)) return
    await loadPage(pageRef.current + 1)
  }, [loading, list.length, total, loadPage])

  const refresh = useCallback(async () => {
    // bump 代数,使在途的旧请求(旧筛选值/旧分页)结果作废
    epochRef.current++
    await loadPage(1, true)
  }, [loadPage])

  // 挂载时自动加载首页(不依赖 InfiniteScroll 的 IntersectionObserver)
  useEffect(() => {
    loadMore().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // deps 模式:筛选变化时强制重置分页状态(绕过 loading/loadedRef 防重),再加载第一页。
  // 跳过首次执行,避免与挂载加载双发。
  const depsFirstRef = useRef(true)
  useEffect(() => {
    if (depsFirstRef.current) {
      depsFirstRef.current = false
      return
    }
    epochRef.current++
    pageRef.current = 0
    loadedRef.current = false
    loadingRef.current = false
    setLoading(false)
    setList([])
    setTotal(0)
    loadPage(1, true).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { list, total, loading, hasMore, loadMore, refresh }
}
