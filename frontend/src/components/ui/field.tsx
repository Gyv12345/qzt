import * as React from "react";
import { cn } from "@/lib/utils";

const Field = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
));
Field.displayName = "Field";

const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  />
));
FieldLabel.displayName = "FieldLabel";

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-muted-foreground text-sm", className)}
    {...props}
  />
));
FieldDescription.displayName = "FieldDescription";

const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-4", className)} {...props} />
));
FieldGroup.displayName = "FieldGroup";

const FieldSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /**
     * The alignment of the separator content
     */
    align?: "start" | "center" | "end";
  }
>(({ className, align = "center", ...props }, ref) => (
  <div ref={ref} className={cn("relative", className)} {...props}>
    <div className="absolute inset-0 flex items-center">
      <span className="w-full border-t" />
    </div>
    <div
      className={cn(
        "relative flex justify-center text-xs uppercase",
        align === "start" && "justify-start",
        align === "end" && "justify-end",
      )}
    >
      <span className="bg-card px-2 text-muted-foreground">
        {props.children}
      </span>
    </div>
  </div>
));
FieldSeparator.displayName = "FieldSeparator";

export { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator };
