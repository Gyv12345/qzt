import { z } from "zod";

export const departmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "部门名称不能为空"),
  parentId: z.string().nullable(),
  sort: z.number(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  isSystem: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Department = z.infer<typeof departmentSchema>;
