import { ZodError, z } from "zod";
import { I18nService } from "nestjs-i18n";

/**
 * Zod v4 i18n 错误映射
 *
 * 配合 NestJS I18nService 使用，提供多语言验证错误消息
 */
export class ZodI18nError {
  static fromZodError(error: ZodError<unknown>, i18n: I18nService): string {
    const firstError = error.issues[0];
    if (!firstError) return i18n.t("common.VALIDATION_ERROR");

    // 如果错误消息已经包含中文，直接返回
    if (/[\u4e00-\u9fa5]/.test(firstError.message)) {
      return firstError.message;
    }

    // 根据错误类型返回 i18n 消息
    return this.getLocalisedMessage(firstError as any, i18n);
  }

  private static getLocalisedMessage(issue: any, i18n: I18nService): string {
    const { code, path } = issue;
    const field = path.join(".");

    switch (code) {
      case "invalid_string":
        if (issue.validation === "email") {
          return i18n.t("validation.EMAIL_INVALID", { args: { field } });
        }
        if (issue.validation === "url") {
          return i18n.t("validation.URL_INVALID", { args: { field } });
        }
        if (issue.validation === "uuid") {
          return i18n.t("validation.UUID_INVALID", { args: { field } });
        }
        return i18n.t("validation.STRING_INVALID", { args: { field } });

      case "too_small":
        if (issue.type === "string") {
          return i18n.t("validation.STRING_MIN", {
            args: { field, min: issue.minimum },
          });
        }
        if (issue.type === "number") {
          return i18n.t("validation.NUMBER_MIN", {
            args: { field, min: issue.minimum },
          });
        }
        if (issue.type === "array") {
          return i18n.t("validation.ARRAY_MIN", {
            args: { field, min: issue.minimum },
          });
        }
        return i18n.t("validation.TO_SMALL", { args: { field } });

      case "too_big":
        if (issue.type === "string") {
          return i18n.t("validation.STRING_MAX", {
            args: { field, max: issue.maximum },
          });
        }
        if (issue.type === "number") {
          return i18n.t("validation.NUMBER_MAX", {
            args: { field, max: issue.maximum },
          });
        }
        return i18n.t("validation.TO_BIG", { args: { field } });

      case "invalid_type":
        return i18n.t("validation.TYPE_INVALID", {
          args: { field, expected: issue.expected },
        });

      case "invalid_enum_value":
        return i18n.t("validation.ENUM_INVALID", {
          args: { field, options: issue.options?.join(", ") },
        });

      default:
        return issue.message || i18n.t("validation.INVALID");
    }
  }
}

/**
 * 创建带 i18n 的验证管道异常
 */
export class ZodValidationException extends Error {
  constructor(
    private zodError: ZodError<unknown>,
    private i18nService: I18nService,
  ) {
    super(ZodI18nError.fromZodError(zodError, i18nService));
    this.name = "ZodValidationException";
  }

  getZodError() {
    return this.zodError;
  }

  getIssues() {
    return this.zodError.issues;
  }
}

/**
 * Zod 验证辅助函数
 * 用于手动验证数据并抛出 i18n 错误
 */
export async function validateAndThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  i18n: I18nService,
): Promise<T> {
  const result = await schema.safeParseAsync(data);

  if (!result.success) {
    throw new ZodValidationException(result.error, i18n);
  }

  return result.data;
}

/**
 * 常用验证器工厂（带中文默认消息）
 *
 * @example
 * ```ts
 * import { v } from '@/common/validation/zod-i18n'
 *
 * export const createUserSchema = z.object({
 *   email: v.email(),
 *   phone: v.phone(),
 *   name: v.requiredString(1, 50),
 * })
 * ```
 */
export const v = {
  email: () =>
    z
      .string({ message: "请输入有效的邮箱地址" })
      .email({ error: "请输入有效的邮箱地址" }),

  phone: () =>
    z
      .string({ message: "手机号格式不正确" })
      .regex(/^1[3-9]\d{9}$/, { error: "手机号格式不正确" }),

  url: () =>
    z
      .string({ message: "请输入有效的网址" })
      .url({ error: "请输入有效的网址" }),

  cuid: (message = "请选择有效的记录") => z.string().cuid({ error: message }),

  requiredString: (min = 1, max = 100) =>
    z
      .string({ message: "此字段为必填项" })
      .min(min, { error: `至少需要 ${min} 个字符` })
      .max(max, { error: `最多 ${max} 个字符` }),

  positiveNumber: (message = "必须大于 0") =>
    z.number({ message }).positive({ error: message }),

  nonNegativeNumber: (message = "必须大于等于 0") =>
    z.number({ message }).nonnegative({ error: message }),

  enum: <T extends readonly [string, ...string[]]>(
    values: T,
    message: string,
  ) => z.enum(values, { message }),
};
