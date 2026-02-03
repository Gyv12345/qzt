/**
 * API 错误处理工具
 */

interface ApiError {
  response?: {
    data?: {
      message?: string
      error?: string
    }
    status?: number
  }
  message?: string
}

/**
 * 处理 API 错误并返回用户友好的错误消息
 */
export function getErrorMessage(error: unknown): string {
  const apiError = error as ApiError

  // 网络错误
  if (!navigator.onLine) {
    return '网络连接失败，请检查网络设置'
  }

  // API 错误响应
  if (apiError?.response?.data?.message) {
    return apiError.response.data.message
  }

  if (apiError?.response?.data?.error) {
    return apiError.response.data.error
  }

  // HTTP 状态码错误
  const status = apiError?.response?.status
  if (status) {
    switch (status) {
      case 400:
        return '请求参数错误，请检查输入'
      case 401:
        return '未授权，请重新登录'
      case 403:
        return '没有权限执行此操作'
      case 404:
        return '请求的资源不存在'
      case 409:
        return '数据冲突，请刷新后重试'
      case 422:
        return '数据验证失败，请检查输入'
      case 429:
        return '请求过于频繁，请稍后再试'
      case 500:
        return '服务器错误，请稍后重试'
      case 502:
        return '网关错误，请稍后重试'
      case 503:
        return '服务暂时不可用，请稍后重试'
      default:
        return `请求失败 (${status})`
    }
  }

  // 默认错误消息
  if (apiError?.message) {
    return apiError.message
  }

  return '操作失败，请重试'
}

/**
 * 显示错误 Toast（需要集成 toast 库）
 */
export function showErrorToast(error: unknown) {
  const message = getErrorMessage(error)
  console.error('API Error:', error)

  // TODO: 集成 toast 库（如 sonner）
  // toast.error(message)
  alert(message) // 临时使用 alert
}

/**
 * 显示成功 Toast
 */
export function showSuccessToast(message: string) {
  // TODO: 集成 toast 库
  // toast.success(message)
  alert(message) // 临时使用 alert
}

/**
 * 处理表单提交错误
 */
export function handleFormError(error: unknown, setError?: (field: string, message: string) => void) {
  const apiError = error as ApiError

  // 处理字段验证错误
  if (apiError?.response?.status === 422) {
    const errors = apiError.response.data as any
    if (errors?.message && typeof errors.message === 'object') {
      // 处理字段级别的错误
      Object.entries(errors.message).forEach(([field, messages]) => {
        if (setError && Array.isArray(messages)) {
          setError(field, messages[0] as string)
        }
      })
      return
    }
  }

  // 显示通用错误
  showErrorToast(error)
}
