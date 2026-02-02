import { useUiStore } from '@/stores/uiStore'
import { CustomerDetailPage } from './CustomerDetailPage'
import { CustomerDetailMobile } from './mobile/CustomerDetailMobile'

/**
 * 智能客户详情组件
 * 根据设备类型自动选择 PC 端或移动端组件
 */
export const CustomerDetail = () => {
  const { isMobile } = useUiStore()

  // 移动端使用移动优化组件
  if (isMobile) {
    return <CustomerDetailMobile />
  }

  // PC 端使用原有组件
  return <CustomerDetailPage />
}
