import type { PageGuide } from './types'

/** PSI 采购单页引导 */
export const purchaseOrderGuide: PageGuide = {
  key: 'psi.purchase-order',
  title: '采购单',
  tour: [
    {
      selector: '[data-guide="add"]',
      title: '新建采购单',
      description: '录入供应商、采购明细(商品/数量/单价),单号留空自动生成,提交后可推进审核与入库。',
    },
    {
      selector: '.ant-pro-table-search',
      title: '搜索与筛选',
      description: '按单号/供应商/单据状态/日期范围筛选采购单。',
    },
    {
      selector: '[data-guide="action-column"]',
      title: '行内操作',
      description: '每行可编辑、查看详情、提交审核;审核通过后关联生成入库单。',
    },
  ],
  help: [
    {
      title: '常用操作',
      body: (
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          <li>新建采购单:点右上「新增」,填写供应商与采购明细。</li>
          <li>明细行支持增删,金额自动按 数量 × 单价 汇总。</li>
          <li>单据状态流转:草稿 → 提交审核 → 已审核 → 入库。</li>
        </ul>
      ),
    },
  ],
}
