import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ExportButtonProps {
  data: any[];
  filename: string;
  type: "customers" | "contracts" | "invoices" | "products" | "custom";
  disabled?: boolean;
}

export function ExportButton({
  data,
  filename,
  type,
  disabled,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = () => {
    if (!data || data.length === 0) {
      toast.error("没有数据可导出");
      return;
    }

    setIsExporting(true);
    try {
      // 转换数据为CSV格式
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(","),
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              // 处理包含逗号或引号的值
              if (
                typeof value === "string" &&
                (value.includes(",") || value.includes('"'))
              ) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value ?? "";
            })
            .join(","),
        ),
      ].join("\n");

      // 添加 BOM 以支持中文
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success("导出成功");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("导出失败");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    if (!data || data.length === 0) {
      toast.error("没有数据可导出");
      return;
    }

    setIsExporting(true);
    try {
      // 创建工作簿
      const wb = XLSX.utils.book_new();

      // 转换数据
      const ws = XLSX.utils.json_to_sheet(data);

      // 设置列宽
      const headers = Object.keys(data[0]);
      ws["!cols"] = headers.map(() => ({ wch: 15 }));

      // 添加工作表
      XLSX.utils.book_append_sheet(wb, ws, "数据");

      // 导出文件
      XLSX.writeFile(wb, `${filename}.xlsx`);

      toast.success("导出成功");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("导出失败");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = () => {
    if (!data || data.length === 0) {
      toast.error("没有数据可导出");
      return;
    }

    setIsExporting(true);
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.json`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success("导出成功");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("导出失败");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          导出
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="h-4 w-4 mr-2" />
          导出为 CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          导出为 Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileText className="h-4 w-4 mr-2" />
          导出为 JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
