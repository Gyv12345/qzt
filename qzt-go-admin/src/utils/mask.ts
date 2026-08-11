/**
 * 数据掩码工具(脱敏)。
 * 用于列表展示时对敏感字段做部分隐藏,编辑/详情表单不掩码。
 */

/** 手机号: 138****5678 */
export function maskPhone(phone?: string): string {
  if (!phone || phone.length < 7) return phone || ''
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

/** 邮箱: z***@example.com */
export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return email || ''
  const [name, domain] = email.split('@')
  if (name.length <= 1) return '*@' + domain
  return name[0] + '***@' + domain
}

/** 身份证号: 1101********1234 */
export function maskIDCard(id?: string): string {
  if (!id || id.length < 8) return id || ''
  return id.slice(0, 4) + '********' + id.slice(-4)
}

/** 银行卡号: 6222 **** **** 9012 */
export function maskBankCard(card?: string): string {
  if (!card || card.length < 8) return card || ''
  return card.slice(0, 4) + ' **** **** ' + card.slice(-4)
}

/** 姓名: 张* / 欧阳** */
export function maskName(name?: string): string {
  if (!name) return ''
  if (name.length <= 1) return name
  return name[0] + '*'.repeat(name.length - 1)
}
