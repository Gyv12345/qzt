"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 手风琴(shadcn/ui 手工移植, FAQ 等场景)。
 * Content 强制 forceMount: 收起态也常驻 DOM(靠 data-[state=closed]:hidden 隐藏),
 * 保证 FAQ 答案永远出现在静态 HTML 里, 供 GEO/搜索引擎直接抓取。
 * 动画依赖 tailwind.config 的 accordion-down/up keyframes。
 */
const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      "glass rounded-xl px-6 transition-colors hover:border-brand-400/50",
      className
    )}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex w-full items-center justify-between gap-4 py-4 text-left text-base font-semibold text-strong transition-all [&[data-state=open]>svg]:rotate-45 hover:text-brandtext focus-visible:outline-none",
        className
      )}
      {...props}
    >
      {children}
      <Plus
        className="h-4 w-4 shrink-0 text-muted transition-transform duration-200"
        aria-hidden="true"
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    forceMount
    className={cn(
      "overflow-hidden text-sm leading-7 text-muted data-[state=closed]:hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up",
      className
    )}
    {...props}
  >
    <div className="pb-4 pr-8">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
