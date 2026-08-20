import axios from 'axios'
import { Toast } from 'antd-mobile'

/** 商城免登录请求封装:统一 /prod-api 前缀,信封 {code,msg,data} 解包(code===0 返回 data) */
const request = axios.create({ baseURL: '/prod-api', timeout: 15000 })

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
