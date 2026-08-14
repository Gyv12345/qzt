import type { PageGuide } from './types'

/** CRM 客户管理页引导 */
export const customerGuide: PageGuide = {
  key: 'crm.customer',
  title: '客户管理',
  tour: [
    {
      selector: '[data-guide="add"]',
      title: '新增客户',
      description: '录入客户基础信息;负责人留空则客户自动进入公海,可稍后再分配领取。',
    },
    {
      selector: '.ant-pro-table-search',
      title: '搜索与筛选',
      description: '按客户名称/等级/来源/负责人等条件筛选,列表实时刷新。',
    },
    {
      selector: '[data-guide="import"]',
      title: '批量导入',
      description: '下载模板后按列填写,可批量导入客户;导入完成自动刷新列表。',
    },
    {
      selector: '[data-guide="action-column"]',
      title: '行内操作',
      description: '每行可编辑、查看跟进记录、转入公海或删除;转入公海后可到「客户公海」重新领取。',
    },
  ],
  help: [
    {
      title: '常用操作',
      body: (
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          <li>新增客户:点右上「新增客户」,填写基础信息;负责人留空则进公海。</li>
          <li>筛选:表格上方搜索区按等级/来源/负责人等条件过滤。</li>
          <li>导入导出:右上「导入/导出」支持 Excel 批量处理。</li>
          <li>释放到公海:行内「更多 → 释放」把客户退回公海池。</li>
        </ul>
      ),
    },
    {
      title: '相关概念',
      body: (
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          <li>私海客户:已分配负责人的客户,仅本人及上级可见(受数据权限控制)。</li>
          <li>公海客户:未分配负责人的客户,可在「客户公海」领取。</li>
        </ul>
      ),
    },
  ],
}
