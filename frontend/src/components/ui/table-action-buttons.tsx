import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ActionButton {
  key: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

interface TableActionButtonsProps {
  items: ActionButton[];
  className?: string;
}

/**
 * 通用表格行内操作按钮组件
 * 统一样式：Ghost 变体 + 图标 + 文字
 */
export function TableActionButtons({
  items,
  className,
}: TableActionButtonsProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      {items.map((item) => (
        <Button
          key={item.key}
          variant="ghost"
          size="sm"
          className={cn(
            item.destructive && "text-destructive hover:text-destructive",
          )}
          onClick={item.onClick}
          disabled={item.disabled}
          title={item.label}
        >
          {item.icon}
          <span>{item.label}</span>
        </Button>
      ))}
    </div>
  );
}
