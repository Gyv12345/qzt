import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 多行文本域(shadcn/ui 手工移植, Tailwind v3 + 本站 --c-* 变量体系)。
 * 纯展示组件: 默认禁止手动拉伸(resize-none), 高度由 min-h 撑开。
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[110px] w-full resize-none rounded-lg border border-line bg-raised px-3.5 py-2.5 text-sm text-strong transition placeholder:text-faint focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/25 disabled:cursor-not-allowed disabled:opacity-60",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
