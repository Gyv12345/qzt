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
import type { Resolver } from "react-hook-form";

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
import type { FieldValues } from "react-hook-form";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodResolver<
  T extends FieldValues = FieldValues,
  TContext = any,
  TOutput = any,
>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schemaOptions?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolverOptions?: any,
): Resolver<T, TContext, TOutput> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return baseZodResolver(schema as any, schemaOptions, resolverOptions) as any;
}
