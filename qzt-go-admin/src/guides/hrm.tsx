import type { PageGuide } from './types'

/** HRM 员工档案页引导 */
export const employeeGuide: PageGuide = {
  key: 'hrm.employee',
  title: '员工档案',
  tour: [
    {
      selector: '[data-guide="add"]',
      title: '新增员工',
      description: '按「基本信息 → 组织信息 → 联系方式」逐段填写员工档案,入职后可关联系统登录账号。',
    },
    {
      selector: '.ant-pro-table-search',
      title: '搜索与筛选',
      description: '按姓名/部门/岗位/在职状态筛选员工。',
    },
    {
      selector: '[data-guide="action-column"]',
      title: '行内操作',
      description: '每行可编辑档案、查看详情、办理离职;离职后账号自动停用。',
    },
  ],
  help: [
    {
      title: '常用操作',
      body: (
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          <li>新增员工:点右上「新增」,表单按基本信息/组织/联系方式分段。</li>
          <li>组织信息:部门与岗位决定数据权限与考勤归属。</li>
          <li>离职办理:行内操作可将员工置为离职,并停用其登录账号。</li>
        </ul>
      ),
    },
  ],
}
