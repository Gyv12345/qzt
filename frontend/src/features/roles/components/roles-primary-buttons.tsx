import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RolesPrimaryButtonsProps {
  onCreate: () => void;
}

export function RolesPrimaryButtons({ onCreate }: RolesPrimaryButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" className="h-8 gap-1" onClick={onCreate}>
        <Plus className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          新建角色
        </span>
      </Button>
    </div>
  );
}
