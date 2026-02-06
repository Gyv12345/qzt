import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ProductsPrimaryButtonsProps {
  onCreate: () => void;
}

export function ProductsPrimaryButtons({
  onCreate,
}: ProductsPrimaryButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button onClick={onCreate} size="sm">
        <Plus className="mr-2 h-4 w-4" />
        新建产品
      </Button>
    </div>
  );
}
