import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * 徽标(shadcn/ui 手工移植, Tailwind v3 + 本站 --c-* 变量体系)。
 * default=品牌徽标 / outline=中性描边 / amber=琥珀高亮(价格/热点);
 * asChild 用法同 Button: <Badge asChild><Link /></Badge> 保留 Link 语义。
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-brand-400/20 bg-brand-500/10 text-brandtext",
        outline: "border-line text-muted",
        amber: "border-accent-light/30 bg-accent/10 text-accent-light",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "span";
    return (
      <Comp
        className={cn(badgeVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
