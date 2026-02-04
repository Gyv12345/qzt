import { z } from 'zod'

export const permissionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '权限名称不能为空'),
  code: z.string().min(1, '权限编码不能为空'),
  description: z.string().optional(),
  module: z.string(),
  status: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Permission = z.infer<typeof permissionSchema>
