import { useNavigate, useSearch } from '@tanstack/react-router'

export interface TableUrlState {
  page: number
  pageSize: number
  keyword?: string
  sortField?: string
  sortOrder?: 'asc' | 'desc'
  [key: string]: any
}

interface UseTableUrlStateOptions {
  defaultPageSize?: number
  defaultPage?: number
}

interface UseTableUrlStateReturn extends TableUrlState {
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  setKeyword: (keyword: string) => void
  setSort: (sortField: string, sortOrder: 'asc' | 'desc') => void
  setFilter: (key: string, value: any) => void
  resetFilters: () => void
  updateState: (updates: Partial<TableUrlState>) => void
}

/**
 * 用于管理表格的 URL 状态
 * 支持分页、搜索、排序和自定义筛选
 *
 * @example
 * ```tsx
 * const { page, pageSize, keyword, setPage, setPageSize, setKeyword } = useTableUrlState()
 *
 * const { data } = useQuery({
 *   queryKey: ['customers', page, pageSize, keyword],
 *   queryFn: () => fetchCustomers({ page: page - 1, pageSize, keyword })
 * })
 * ```
 */
export function useTableUrlState(
  options: UseTableUrlStateOptions = {}
): UseTableUrlStateReturn {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as any

  const {
    defaultPageSize = 10,
    defaultPage = 1,
  } = options

  // 从 URL 读取状态，使用默认值
  const state: TableUrlState = {
    page: search.page ?? defaultPage,
    pageSize: search.pageSize ?? defaultPageSize,
    keyword: search.keyword ?? '',
    sortField: search.sortField,
    sortOrder: search.sortOrder,
    ...search,
  }

  // 更新 URL 状态
  const updateState = (updates: Partial<TableUrlState>) => {
    navigate({
      search: (prev: any) => ({
        ...prev,
        ...updates,
      }),
    })
  }

  // 设置页码
  const setPage = (page: number) => {
    updateState({ page })
  }

  // 设置每页大小
  const setPageSize = (pageSize: number) => {
    updateState({ pageSize, page: 1 }) // 改变页大小时重置到第一页
  }

  // 设置搜索关键词
  const setKeyword = (keyword: string) => {
    updateState({ keyword, page: 1 }) // 搜索时重置到第一页
  }

  // 设置排序
  const setSort = (sortField: string, sortOrder: 'asc' | 'desc') => {
    updateState({ sortField, sortOrder })
  }

  // 设置筛选条件
  const setFilter = (key: string, value: any) => {
    updateState({ [key]: value, page: 1 }) // 筛选时重置到第一页
  }

  // 重置所有筛选条件（保留分页）
  const resetFilters = () => {
    const resetState: Partial<TableUrlState> = {
      keyword: '',
      sortField: undefined,
      sortOrder: undefined,
      page: defaultPage,
    }

    // 清除其他自定义筛选
    Object.keys(search).forEach(key => {
      if (!['page', 'pageSize'].includes(key)) {
        resetState[key] = undefined
      }
    })

    updateState(resetState)
  }

  return {
    ...state,
    setPage,
    setPageSize,
    setKeyword,
    setSort,
    setFilter,
    resetFilters,
    updateState,
  }
}

/**
 * 用于管理单个筛选条件的 Hook
 *
 * @example
 * ```tsx
 * const { value, setValue } = useFilterParam('status')
 * ```
 */
export function useFilterParam<T = any>(
  key: string,
  defaultValue?: T
) {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as any

  const value = search[key] ?? defaultValue

  const setValue = (newValue: T) => {
    navigate({
      search: (prev: any) => ({
        ...prev,
        [key]: newValue,
        page: 1, // 筛选时重置到第一页
      }),
    })
  }

  const clearValue = () => {
    navigate({
      search: (prev: any) => {
        const { [key]: _, ...rest } = prev
        return rest
      },
    })
  }

  return {
    value,
    setValue,
    clearValue,
  }
}

/**
 * 用于管理多个筛选条件的 Hook
 *
 * @example
 * ```tsx
 * const { filters, setFilter, clearFilter, clearAllFilters } = useFilterParams({
 *   status: 'active',
 *   level: undefined
 * })
 * ```
 */
export function useFilterParams<T extends Record<string, any>>(
  defaultFilters: T
) {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as any

  // 合并默认值和 URL 值
  const filters: T = { ...defaultFilters }
  Object.keys(defaultFilters).forEach(key => {
    if (search[key] !== undefined) {
      filters[key] = search[key]
    }
  })

  const setFilter = <K extends keyof T>(key: K, value: T[K]) => {
    navigate({
      search: (prev: any) => ({
        ...prev,
        [key]: value,
        page: 1,
      }),
    })
  }

  const clearFilter = (key: keyof T) => {
    navigate({
      search: (prev: any) => {
        const { [key]: _, ...rest } = prev
        return rest
      },
    })
  }

  const clearAllFilters = () => {
    navigate({
      search: (prev: any) => {
        const cleared = { ...prev }
        Object.keys(defaultFilters).forEach(key => {
          delete cleared[key]
        })
        return cleared
      },
    })
  }

  return {
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
  }
}
