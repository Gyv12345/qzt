import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ContractsPrimaryButtonsProps {
  onCreate: () => void;
}

export function ContractsPrimaryButtons({
  onCreate,
}: ContractsPrimaryButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button onClick={onCreate} size="sm">
        <Plus className="mr-2 h-4 w-4" />
        新建合同
      </Button>
    </div>
  );
}
