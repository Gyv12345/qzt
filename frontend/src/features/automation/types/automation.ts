import { z } from 'zod'

export const automationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  trigger: z.string(),
  action: z.string(),
  enabled: z.boolean(),
  lastExecutedAt: z.string().optional(),
  nextExecutedAt: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type AutomationRule = z.infer<typeof automationRuleSchema>

export interface AutomationRuleListResponse {
  items: AutomationRule[]
  total: number
}
