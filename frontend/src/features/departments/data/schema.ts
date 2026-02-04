import { z } from 'zod'

export const departmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '部门名称不能为空'),
  code: z.string().min(1, '部门编码不能为空'),
  description: z.string().optional(),
  status: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Department = z.infer<typeof departmentSchema>
