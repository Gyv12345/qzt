import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

/** 商城路由:浏览/购买免登录,登录/我的/领券为增值入口。app-shell 在 PC 端限宽居中(移动端全宽)。 */
export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Navigate to="/goods" replace />} />
          <Route path="/goods" element={page('goods')} />
          <Route path="/goods/:id" element={page('goods/detail')} />
          <Route path="/cart" element={page('cart')} />
          <Route path="/checkout" element={page('checkout')} />
          <Route path="/order/query" element={page('order/query')} />
          <Route path="/login" element={page('auth/login')} />
          <Route path="/mine" element={page('mine')} />
          <Route path="/coupons" element={page('coupons/center')} />
          <Route path="*" element={<Navigate to="/goods" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

// 页面体量小,全部同步打包(免登录商城首屏要快)
import GoodsList from './pages/goods'
import GoodsDetail from './pages/goods/detail'
import Cart from './pages/cart'
import Checkout from './pages/checkout'
import OrderQuery from './pages/order/query'
import Login from './pages/auth/login'
import Mine from './pages/mine'
import CouponsCenter from './pages/coupons/center'

function page(name: string) {
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
    case 'auth/login':
      return <Login />
    case 'mine':
      return <Mine />
    case 'coupons/center':
      return <CouponsCenter />
    default:
      return <GoodsList />
  }
}
