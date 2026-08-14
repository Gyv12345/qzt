import type { PageGuide } from './types'

/** OA 出差申请页引导 */
export const tripGuide: PageGuide = {
  key: 'oa.trip',
  title: '出差申请',
  tour: [
    {
      selector: '[data-guide="add"]',
      title: '发起出差申请',
      description: '填写出差事由、时间与行程,提交后走审批流;审批通过后可在 HRM 侧关联考勤。',
    },
    {
      selector: '.ant-pro-table-search',
      title: '搜索与筛选',
      description: '按申请人/状态/日期筛选出差单。',
    },
    {
      selector: '[data-guide="action-column"]',
      title: '行内操作',
      description: '草稿可编辑重提;已提交的单据可查看审批进度。',
    },
  ],
  help: [
    {
      title: '常用操作',
      body: (
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          <li>发起申请:点右上「新增」,填写出差信息后提交审批。</li>
          <li>审批状态:列表「状态」列实时反映审批进度,详情页可看流转记录。</li>
        </ul>
      ),
    },
  ],
}
