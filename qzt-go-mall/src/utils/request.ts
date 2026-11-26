import axios from 'axios'
import { Toast } from 'antd-mobile'
import { useUserStore } from '../stores/user'

/** 商城请求封装:统一 /prod-api 前缀,信封 {code,msg,data} 解包(code===0 返回 data) */
const request = axios.create({ baseURL: '/prod-api', timeout: 15000 })

// 已登录买家(/mall/auth/*)自动带 mall token;匿名请求(免登录购物全流程)不加头
request.interceptors.request.use((config) => {
  const token = useUserStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

request.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data
      Toast.show({ content: body.msg || '请求失败' })
      return Promise.reject(new Error(body.msg || '请求失败'))
    }
    return body
  },
  (err) => {
    Toast.show({ content: '网络异常,请稍后重试' })
    return Promise.reject(err)
  },
)

export default request
