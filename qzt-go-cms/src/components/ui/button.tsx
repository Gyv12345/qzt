import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * 按钮(shadcn/ui 手工移植, Tailwind v3 + 本站 --c-* 变量体系)。
 * default = 品牌渐变 CTA(收编全站重复的渐变按钮串);
 * asChild 用法: <Button asChild><Link href/></Button> —— 保留 Link 语义(SEO)。
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-canvas transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 no-underline",
  {
    variants: {
      variant: {
        // 品牌渐变 CTA + 光晕(hover 上浮)
        default:
          "bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-glow-sm hover:-translate-y-0.5 hover:shadow-glow",
        // 玻璃面次级按钮(收集第二套重复串: border-line bg-raised + hover 亮边)
        secondary:
          "border border-line bg-raised text-normal backdrop-blur-sm hover:-translate-y-0.5 hover:border-brand-400/40 hover:text-strong",
        outline:
          "border border-line bg-surface text-normal hover:border-brand-400/40 hover:text-brandtext",
        ghost: "text-muted hover:bg-raised hover:text-strong",
        link: "text-brandtext underline-offset-4 hover:underline",
      },
      size: {
        default: "px-7 py-3",
        sm: "px-4 py-2 text-xs",
        lg: "px-8 py-3.5",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
