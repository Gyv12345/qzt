import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ContractTemplatesPrimaryButtonsProps {
  onCreate: () => void;
}

export function ContractTemplatesPrimaryButtons({
  onCreate,
}: ContractTemplatesPrimaryButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button onClick={onCreate} size="sm" className="h-8">
        <Plus className="mr-2 h-4 w-4" />
        新建模板
      </Button>
    </div>
  );
}
