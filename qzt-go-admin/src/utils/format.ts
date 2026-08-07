/**
 * format.ts 全站公共格式化工具。
 * 集中金额/日期等展示逻辑,避免各页面各写一套(此前金额曾有 toFixed(2)、toLocaleString、裸拼接三种写法)。
 */

/**
 * 格式化金额:统一输出「¥1,234.50」(千分位 + 两位小数)。
 * 空值/0 的处理由调用方决定——这里只负责格式,不做业务判断。
 *
 * @param v 金额(后端 decimal 传 string,也可能 number/null)
 * @param symbol 货币符号,默认 ¥
 */
export function formatMoney(
  v: string | number | null | undefined,
  symbol = '¥',
): string {
  const n = Number(v ?? 0)
  if (Number.isNaN(n)) return `${symbol}0.00`
  return `${symbol}${n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
