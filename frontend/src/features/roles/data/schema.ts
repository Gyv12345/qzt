import { z } from "zod";

export const roleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "角色名称不能为空"),
  code: z.string().min(1, "角色编码不能为空"),
  description: z.string().optional(),
  type: z.string(),
  status: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Role = z.infer<typeof roleSchema>;
