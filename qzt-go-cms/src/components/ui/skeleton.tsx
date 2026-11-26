import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 骨架屏占位(shadcn/ui 手工移植)。
 * raised 底色 + 呼吸动效, 供列表/卡片加载态复用。
 */
const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("animate-pulse rounded-lg bg-raised", className)}
    {...props}
  />
));
Skeleton.displayName = "Skeleton";

export { Skeleton };
