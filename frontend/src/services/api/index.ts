/**
 * API 模块统一导出
 * 按 tags 模式拆分，每个模块独立维护
 */

// 首先导入所有函数到当前作用域
import { getAuth as getAuthApi } from './auth'
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
import { getPricing } from './pricing'
import { getOss } from './oss'
import { getLogs } from './logs'
import { getLoginLogs } from './login-logs'
import { getWebhook } from './webhook'
import { getCustomerContacts } from './customer-contacts'
import { getProductPackages } from './product-packages'
import { getProductFlows } from './product-flows'
import { getContractTemplates } from './contract-templates'
import { getSocialMediaPosts } from './social-media-posts'
import { getSocialMediaAccounts } from './social-media-accounts'
import { getSystemConfig } from './system-config'
import { getNotifications } from './notifications'

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
export { getPricing }
export { getOss }
export { getLogs }
export { getLoginLogs }
export { getWebhook }
export { getCustomerContacts }
export { getProductPackages }
export { getProductFlows }
export { getContractTemplates }
export { getSocialMediaPosts }
export { getSocialMediaAccounts }
export { getSystemConfig }
export { getNotifications }

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
  ...getPricing(),
  ...getOss(),
  ...getLogs(),
  ...getLoginLogs(),
  ...getWebhook(),
  ...getCustomerContacts(),
  ...getProductPackages(),
  ...getProductFlows(),
  ...getContractTemplates(),
  ...getSocialMediaPosts(),
  ...getSocialMediaAccounts(),
  ...getSystemConfig(),
  ...getNotifications(),
})
