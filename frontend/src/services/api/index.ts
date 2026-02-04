/**
 * API 模块统一导出
 * 按 tags 模式拆分，每个模块独立维护
 */

// 首先导入所有函数到当前作用域
import { get as getAuthApi } from './认证'
import { getCustomers } from './customers'
import { getUsers } from './users'
import { getContacts } from './contacts'
import { getProducts } from './products'
import { getContracts } from './contracts'
import { getPayments } from './payments'
import { getInvoices } from './invoices'
import { getFollowRecords } from './follow-records'
import { getDepartments } from './departments'
import { getPermissions } from './permissions'
import { getServiceTeams } from './service-teams'
import { getStatistics } from './statistics'
import { getSystem } from './system'
import { getAutomation } from './automation'
import { getPricing } from './pricing'
import { getOss } from './oss'
import { getLogs } from './logs'
import { getWebhook } from './webhook'
import { getRules } from './rules'
import { getCustomerContacts } from './customer-contacts'

// 中文模块
import { get as getProductPackagesApi } from './产品套餐'
import { get as getProductFlowsApi } from './产品流程'
import { get as getContractTemplatesApi } from './合同模板'
import { get as getPaymentCallbackApi } from './支付回调'
import { get as getPaymentOrdersApi } from './支付订单'
import { get as getPaymentConfigsApi } from './支付配置'
import { get as getSocialMediaContentApi } from './新媒体管理-内容'
import { get as getSocialMediaAccountsApi } from './新媒体管理-账号'
import { get as getSystemSettingsApi } from './系统设置'
import { get as getNotificationsApi } from './通知管理'

// 重新导出所有模块
export { getAuthApi }
export { getCustomers }
export { getUsers }
export { getContacts }
export { getProducts }
export { getContracts }
export { getPayments }
export { getInvoices }
export { getFollowRecords }
export { getDepartments }
export { getPermissions }
export { getServiceTeams }
export { getStatistics }
export { getSystem }
export { getAutomation }
export { getPricing }
export { getOss }
export { getLogs }
export { getWebhook }
export { getRules }
export { getCustomerContacts }
export { getProductPackagesApi }
export { getProductFlowsApi }
export { getContractTemplatesApi }
export { getPaymentCallbackApi }
export { getPaymentOrdersApi }
export { getPaymentConfigsApi }
export { getSocialMediaContentApi }
export { getSocialMediaAccountsApi }
export { getSystemSettingsApi }
export { getNotificationsApi }

// 兼容旧的 getScrmApi
export const getScrmApi = () => ({
  ...getAuthApi(),
  ...getCustomers(),
  ...getUsers(),
  ...getContacts(),
  ...getProducts(),
  ...getContracts(),
  ...getPayments(),
  ...getInvoices(),
  ...getFollowRecords(),
  ...getDepartments(),
  ...getPermissions(),
  ...getServiceTeams(),
  ...getStatistics(),
  ...getSystem(),
  ...getAutomation(),
  ...getPricing(),
  ...getOss(),
  ...getLogs(),
  ...getWebhook(),
  ...getRules(),
  ...getCustomerContacts(),
})
