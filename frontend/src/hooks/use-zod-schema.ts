import { useTranslation } from "react-i18next";
import { z } from "zod";

/**
 * Zod v4 i18n 验证消息工厂
 *
 * 配合 react-i18next 使用，动态生成带多语言错误消息的 Zod schema
 *
 * @example
 * ```tsx
 * function LoginForm() {
 *   const schema = useZodSchema((t) => ({
 *     email: z.string().min(1, { error: t('validation._required') })
 *                .email({ error: t('validation.string.email') }),
 *     password: z.string().min(6, { error: t('validation.string.min', { min: 6 }) }),
 *   }))
 *
 *   const form = useForm({ resolver: zodResolver(schema) })
 *   // ...
 * }
 * ```
 */
export function useZodSchema<T extends z.ZodRawShape>(
  schemaFn: (t: (key: string, params?: Record<string, unknown>) => string) => T,
): z.ZodObject<T> {
  const { t } = useTranslation();
  return z.object(schemaFn(t));
}

/**
 * 简化的验证消息获取器
 * 无需使用 Hook 的场景（如组件外部）
 */
export function getZodMessage(
  t: (key: string, params?: Record<string, unknown>) => string,
) {
  return {
    // 通用
    required: t("validation._required"),
    invalid: t("validation._invalid"),

    // 字符串
    string: {
      min: (min: number) => t("validation.string.min", { min }),
      max: (max: number) => t("validation.string.max", { max }),
      email: t("validation.string.email"),
      url: t("validation.string.url"),
      cuid: t("validation.string.cuid"),
      phone: t("validation.string.phone"),
    },

    // 数字
    number: {
      min: (min: number) => t("validation.number.min", { min }),
      max: (max: number) => t("validation.number.max", { max }),
      positive: t("validation.number.positive"),
      nonnegative: t("validation.number.nonnegative"),
    },

    // 枚举
    enum: {
      invalid: t("validation.enum.invalid"),
    },
  };
}

/**
 * 常用验证器工厂（带 i18n）
 *
 * @example
 * ```tsx
 * const schema = useZodSchema((t) => ({
 *   email: validators.email(t),
 *   phone: validators.phone(t),
 *   amount: validators.positiveNumber(t),
 * }))
 * ```
 */
export const validators = {
  email: (t: (key: string, params?: Record<string, unknown>) => string) =>
    z.string().email({ error: t("validation.string.email") }),

  phone: (t: (key: string, params?: Record<string, unknown>) => string) =>
    z.string().regex(/^1[3-9]\d{9}$/, { error: t("validation.string.phone") }),

  url: (t: (key: string, params?: Record<string, unknown>) => string) =>
    z.string().url({ error: t("validation.string.url") }),

  cuid: (t: (key: string, params?: Record<string, unknown>) => string) =>
    z.string().cuid({ error: t("validation.string.cuid") }),

  positiveNumber: (
    t: (key: string, params?: Record<string, unknown>) => string,
  ) => z.number().positive({ error: t("validation.number.positive") }),

  nonNegativeNumber: (
    t: (key: string, params?: Record<string, unknown>) => string,
  ) => z.number().nonnegative({ error: t("validation.number.nonnegative") }),

  requiredString: (
    t: (key: string, params?: Record<string, unknown>) => string,
    min = 1,
  ) => z.string().min(min, { error: t("validation._required") }),

  enum: <T extends readonly [string, ...string[]]>(
    values: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _t: (key: string, params?: Record<string, unknown>) => string,
  ) => z.enum(values, { error: "请选择有效的选项" }),
};

/**
 * 从 Zod error issues 中提取第一个错误消息（i18n）
 */
export function getFirstZodError(
  issues: z.ZodIssue[],
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (issues.length === 0) return t("validation._invalid");

  const firstIssue = issues[0];

  // 如果 issue 已经有 message，直接返回
  if (firstIssue.message) {
    return firstIssue.message;
  }

  // 否则返回默认错误
  return t("validation._invalid");
}

/**
 * 将 Zod 错误转换为表单字段错误对象
 */
export function zodErrorsToFormErrors(
  issues: z.ZodIssue[],
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of issues) {
    if (issue.path.length > 0) {
      const field = issue.path.join(".");
      errors[field] = issue.message;
    }
  }

  return errors;
}
