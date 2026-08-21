import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

/** 商城路由:免登录,商品列表为首页。app-shell 在 PC 端限宽居中(移动端全宽)。 */
export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Navigate to="/goods" replace />} />
          <Route path="/goods" element={lazyPage('goods')} />
          <Route path="/goods/:id" element={lazyPage('goods/detail')} />
          <Route path="/cart" element={lazyPage('cart')} />
          <Route path="/checkout" element={lazyPage('checkout')} />
          <Route path="/order/query" element={lazyPage('order/query')} />
          <Route path="*" element={<Navigate to="/goods" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

// 五个页面体量小,全部同步打包(免登录商城首屏要快)
import GoodsList from './pages/goods'
import GoodsDetail from './pages/goods/detail'
import Cart from './pages/cart'
import Checkout from './pages/checkout'
import OrderQuery from './pages/order/query'

function lazyPage(name: string) {
  switch (name) {
    case 'goods':
      return <GoodsList />
    case 'goods/detail':
      return <GoodsDetail />
    case 'cart':
      return <Cart />
    case 'checkout':
      return <Checkout />
    case 'order/query':
      return <OrderQuery />
    default:
      return <GoodsList />
  }
}
