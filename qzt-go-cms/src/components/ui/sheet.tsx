"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 抽屉(shadcn/ui 手工移植, Radix Dialog 驱动, Tailwind v3 + 本站 --c-* 变量体系)。
 * 本站当前只用 top(移动端导航: 从吸顶头部下方滑出, 不遮头部); 其余 side 按
 * shadcn 官方模板保留完整 switch 备用。动画依赖 tailwindcss-animate 插件。
 */
export type SheetSide = "top" | "bottom" | "left" | "right";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 top-16 z-[55] bg-canvas/60 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

/** 各方向的定位与出入场类(top 为本站定制, 其余为 shadcn 官方模板)。 */
function sideClasses(side: SheetSide): string {
  switch (side) {
    case "bottom":
      return "inset-x-0 bottom-0 h-auto rounded-t-2xl border-t data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom";
    case "left":
      return "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-left sm:max-w-sm";
    case "right":
      return "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right sm:max-w-sm";
    case "top":
    default:
      return "inset-x-0 top-16 h-[calc(100vh-4rem)] rounded-b-2xl border-b data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-8 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-8";
  }
}

const SheetContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
    side?: SheetSide;
  }
>(({ className, side = "top", children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-[60] bg-drawerbg shadow-2xl backdrop-blur-xl transition duration-300",
        sideClasses(side),
        className
      )}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg border border-line bg-raised text-normal transition-colors hover:bg-brand-500/15 hover:text-strong focus-visible:outline-none">
        <X className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">关闭</span>
      </SheetPrimitive.Close>
      <SheetTitle className="sr-only">导航</SheetTitle>
      <SheetDescription className="sr-only">站点导航菜单</SheetDescription>
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("font-display text-lg font-semibold text-strong", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription };
