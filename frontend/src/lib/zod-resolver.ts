/**
 * Zod v4 兼容层
 *
 * @hookform/resolvers@5.2.2 对 Zod v4 的类型定义支持不完整
 * 临时使用类型断言绕过 TypeScript 检查，运行时验证完全正常
 *
 * 追踪问题: https://github.com/react-hook-form/resolvers/issues/813
 * 清理时机: 等待 @hookform/resolvers 发布 Zod v4 兼容版本后移除 as any
 */

import { zodResolver as baseZodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

/**
 * Zod v4 兼容的 zodResolver
 *
 * @example
 * ```tsx
 * import { zodResolver } from "@/lib/zod-resolver";
 *
 * const form = useForm({
 *   resolver: zodResolver(schema),  // 无需 as any
 * });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodResolver<TInput extends z.ZodTypeAny, TContext = unknown>(
  schema: TInput,
  ...args: Parameters<typeof baseZodResolver>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return baseZodResolver(schema as any, ...args) as any;
}
