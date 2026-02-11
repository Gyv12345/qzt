/**
 * useZodSchema 使用示例
 *
 * 展示如何在前端组件中使用 i18n Zod schema
 */

import { useZodSchema, validators } from "@/hooks/use-zod-schema";
import { z } from "zod";

// 示例 1: 登录表单 Schema
export function useLoginSchema() {
  return useZodSchema((t) => ({
    username: z
      .string()
      .min(1, { error: t("validation._required") })
      .min(3, { error: t("validation.string.min", { min: 3 }) })
      .max(50, { error: t("validation.string.max", { max: 50 }) }),
    password: z
      .string()
      .min(1, { error: t("validation._required") })
      .min(6, { error: t("validation.string.min", { min: 6 }) }),
  }));
}

// 示例 2: 客户表单 Schema（使用 validators 工厂）
export function useCustomerFormSchema() {
  return useZodSchema((t) => ({
    name: validators.requiredString(t, 200),
    shortName: z
      .string()
      .max(100, { error: t("validation.string.max", { max: 100 }) })
      .optional(),
    phone: validators.phone(t).optional(),
    email: validators.email(t).optional(),
    website: validators.url(t),
    customerLevel: z.enum(["LEAD", "PROSPECT", "CUSTOMER", "VIP"], {
      message: t("validation.enum.invalid"),
    }),
  }));
}

// 示例 3: 联系人表单 Schema
export function useContactFormSchema() {
  return useZodSchema((t) => ({
    name: validators.requiredString(t, 50),
    phone: validators.phone(t),
    email: validators.email(t).optional(),
    customerId: validators.cuid(t),
    position: z
      .string()
      .max(50, { error: t("validation.string.max", { max: 50 }) })
      .optional(),
    remark: z
      .string()
      .max(500, { error: t("validation.string.max", { max: 500 }) })
      .optional(),
  }));
}
