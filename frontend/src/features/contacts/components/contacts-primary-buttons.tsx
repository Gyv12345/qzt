import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableExportImport } from "./data-table-export-import";
import type { Contact } from "../types/contact";

interface ContactsPrimaryButtonsProps {
  onCreate: () => void;
  onImportSuccess?: () => void;
  selectedData?: Contact[];
}

export function ContactsPrimaryButtons({
  onCreate,
  onImportSuccess,
  selectedData,
}: ContactsPrimaryButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <DataTableExportImport
        module="contact"
        selectedData={selectedData}
        onImportSuccess={onImportSuccess}
      />
      <Button size="sm" className="h-8 gap-1" onClick={onCreate}>
        <Plus className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          新建联系人
        </span>
      </Button>
    </div>
  );
}
