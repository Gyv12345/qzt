import { z } from "zod";

// 产品 Schema
export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  description: z.string().optional(),
  price: z.number(),
  timeline: z.array(z.string()).optional(),
  imageId: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Product = z.infer<typeof productSchema>;

// 产品列表响应
export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}
