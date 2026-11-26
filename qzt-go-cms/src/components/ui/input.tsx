import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 输入框(shadcn/ui 手工移植, Tailwind v3 + 本站 --c-* 变量体系)。
 * 纯展示组件: 受控逻辑/错误态文案由调用方在 client 组件内实现。
 */
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-lg border border-line bg-raised px-3.5 py-2 text-sm text-strong transition placeholder:text-faint focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/25 disabled:cursor-not-allowed disabled:opacity-60",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
