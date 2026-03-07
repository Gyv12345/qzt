import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface InvoicesPrimaryButtonsProps {
  onCreate: () => void;
}

export function InvoicesPrimaryButtons({
  onCreate,
}: InvoicesPrimaryButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" className="h-8 gap-1" onClick={onCreate}>
        <Plus className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          新建开票
        </span>
      </Button>
    </div>
  );
}
