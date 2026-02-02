import { useUiStore } from '@/stores/uiStore'
import { CustomerListPage } from './CustomerListPage'
import { CustomerListMobile } from './mobile/CustomerListMobile'

/**
 * 智能客户列表组件
 * 根据设备类型自动选择 PC 端或移动端组件
 */
export const CustomerList = () => {
  const { isMobile } = useUiStore()

  // 移动端使用移动优化组件
  if (isMobile) {
    return <CustomerListMobile />
  }

  // PC 端使用原有组件
  return <CustomerListPage />
}
