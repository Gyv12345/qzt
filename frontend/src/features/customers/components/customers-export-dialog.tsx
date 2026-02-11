import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";

interface CustomersExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters?: {
    keyword?: string;
    customerLevel?: string;
    followUserId?: string;
  };
}

interface ExportField {
  key: string;
  label: string;
  defaultSelected: boolean;
}

const exportFields: ExportField[] = [
  { key: "name", label: "公司名称", defaultSelected: true },
  { key: "shortName", label: "简称", defaultSelected: true },
  { key: "code", label: "客户编码", defaultSelected: true },
  { key: "industry", label: "行业", defaultSelected: true },
  { key: "scale", label: "规模", defaultSelected: false },
  { key: "address", label: "地址", defaultSelected: false },
  { key: "website", label: "网站", defaultSelected: false },
  { key: "customerLevel", label: "客户等级", defaultSelected: true },
  { key: "sourceChannel", label: "来源渠道", defaultSelected: true },
  { key: "followUserName", label: "跟进人", defaultSelected: true },
  { key: "contactName", label: "联系人", defaultSelected: true },
  { key: "contactPhone", label: "联系电话", defaultSelected: true },
  { key: "contactEmail", label: "邮箱", defaultSelected: true },
  { key: "tags", label: "标签", defaultSelected: false },
  { key: "remark", label: "备注", defaultSelected: false },
  { key: "createdAt", label: "创建时间", defaultSelected: true },
];

export function CustomersExportDialog({
  open,
  onOpenChange,
  currentFilters,
}: CustomersExportDialogProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(exportFields.filter((f) => f.defaultSelected).map((f) => f.key)),
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportAll, setExportAll] = useState(false);

  const handleToggleField = useCallback((key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedFields(new Set(exportFields.map((f) => f.key)));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setSelectedFields(new Set());
  }, []);

  const handleExport = useCallback(async () => {
    if (selectedFields.size === 0) {
      toast.error("请至少选择一个导出字段");
      return;
    }

    setIsExporting(true);
    try {
      const { customerControllerExportCustomers } = getScrmApi();

      // 构建查询参数
      const params: any = {};
      if (exportAll) {
        // 导出全部，应用当前筛选条件
        if (currentFilters?.keyword) params.keyword = currentFilters.keyword;
        if (currentFilters?.customerLevel)
          params.customerLevel = currentFilters.customerLevel;
        if (currentFilters?.followUserId)
          params.followUserId = currentFilters.followUserId;
        // 设置大页面大小获取所有数据
        params.pageSize = 10000;
        params.page = 1;
      } else {
        // 只导出当前页
        Object.assign(params, currentFilters || {});
      }

      const response = await customerControllerExportCustomers(params);

      // 创建 blob 并下载
      const blob = new Blob([response as any], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("导出成功");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "导出失败");
    } finally {
      setIsExporting(false);
    }
  }, [selectedFields, exportAll, currentFilters, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>导出客户数据</DialogTitle>
          <DialogDescription>选择要导出的字段和数据范围</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-4">
          {/* 数据范围选择 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">数据范围</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={!exportAll}
                  onCheckedChange={() => setExportAll(false)}
                />
                <span>当前页数据</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={exportAll}
                  onCheckedChange={() => setExportAll(true)}
                />
                <span>全部数据（应用当前筛选条件）</span>
              </label>
            </div>
          </div>

          {/* 字段选择 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">导出字段</h4>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  全选
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                  清空
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {exportFields.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-2 text-sm p-2 border rounded hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={selectedFields.has(field.key)}
                    onCheckedChange={() => handleToggleField(field.key)}
                  />
                  <span className="truncate">{field.label}</span>
                </label>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              已选择 {selectedFields.size} 个字段
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedFields.size === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "导出中..." : "导出"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
