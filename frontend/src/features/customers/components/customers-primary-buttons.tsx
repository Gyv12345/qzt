import { Button } from "@/components/ui/button";
import { Plus, Upload, Download } from "lucide-react";

interface CustomersPrimaryButtonsProps {
  onCreate: () => void;
  onImport: () => void;
  onExport: () => void;
}

export function CustomersPrimaryButtons({
  onCreate,
  onImport,
  onExport,
}: CustomersPrimaryButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1"
        onClick={onImport}
      >
        <Upload className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          导入
        </span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1"
        onClick={onExport}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          导出
        </span>
      </Button>
      <Button size="sm" className="h-8 gap-1" onClick={onCreate}>
        <Plus className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          新建客户
        </span>
      </Button>
    </div>
  );
}
