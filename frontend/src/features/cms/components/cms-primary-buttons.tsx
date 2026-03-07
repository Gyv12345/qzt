import { Button } from "@/components/ui/button";
import { Plus, Tags } from "lucide-react";

interface CmsPrimaryButtonsProps {
  onCreate: (type?: string) => void;
  onManageTags: () => void;
  currentType?: string;
}

export function CmsPrimaryButtons({
  onCreate,
  onManageTags,
  currentType,
}: CmsPrimaryButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={onManageTags}>
        <Tags className="mr-2 h-4 w-4" />
        标签管理
      </Button>
      <Button onClick={() => onCreate(currentType)}>
        <Plus className="mr-2 h-4 w-4" />
        新建内容
      </Button>
    </div>
  );
}
