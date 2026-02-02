import { useUiStore } from '@/stores/uiStore'
import { ProductListPage } from './ProductListPage'
import { ProductListMobile } from './mobile/ProductListMobile'

/**
 * 智能产品列表组件
 * 根据设备类型自动选择 PC 端或移动端组件
 */
export const ProductList = () => {
  const { isMobile } = useUiStore()

  // 移动端使用移动优化组件
  if (isMobile) {
    return <ProductListMobile />
  }

  // PC 端使用原有组件
  return <ProductListPage />
}
