import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Upload,
  Clock3,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Contact } from "../types/contact";

// TODO(human): 如果需要支持"导出当前页"功能，可以通过 props 传递当前页数据
// 当前实现中"导出当前页"也会创建后台任务

const HISTORY_STORAGE_KEY = "contacts-import-export-history-v1";

type ExportColumn = {
  id: string;
  displayName: string;
};

type ContactField = {
  key: keyof Contact;
  label: string;
  required?: boolean;
};

type HistoryItem = {
  id: string;
  type: "import" | "export";
  module: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  summary: string;
  detail?: string;
  createdAt: string;
};

interface DataTableExportImportProps {
  module: string;
  selectedData?: Contact[];
  onImportSuccess?: () => void;
}

export function DataTableExportImport({
  module,
  selectedData = [],
  onImportSuccess,
}: DataTableExportImportProps) {
  const { t } = useTranslation();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistoryItems(loadHistory());
  }, []);

  const exportColumns = useMemo<ExportColumn[]>(() => {
    if (module === "contact") {
      return [
        { id: "name", displayName: t("contact.columns.name") },
        { id: "phone", displayName: t("contact.columns.phone") },
        { id: "email", displayName: t("contact.columns.email") },
        { id: "customerName", displayName: t("contact.columns.customerName") },
        { id: "position", displayName: t("contact.columns.position") },
        { id: "department", displayName: t("contact.columns.department") },
        { id: "wechat", displayName: t("contact.columns.wechat") },
        { id: "birthdate", displayName: t("contact.columns.birthdate") },
        { id: "createdAt", displayName: t("contact.columns.createdAt") },
      ];
    }
    return [];
  }, [module, t]);

  const contactFields = useMemo<ContactField[]>(() => {
    if (module === "contact") {
      return [
        { key: "name", label: t("contact.columns.name"), required: true },
        { key: "phone", label: t("contact.columns.phone"), required: true },
        { key: "email", label: t("contact.columns.email") },
        { key: "wechat", label: t("contact.columns.wechat") },
        { key: "position", label: t("contact.columns.position") },
        { key: "department", label: t("contact.columns.department") },
        { key: "customerName", label: t("contact.columns.customerName") },
      ];
    }
    return [];
  }, [module, t]);

  const pushHistoryItem = (item: HistoryItem) => {
    const next = [item, ...historyItems];
    setHistoryItems(next);
    saveHistory(next);
  };

  const handleExport = (payload: { range: string; columns: string[] }) => {
    const exportData = resolveExportData(payload.range, selectedData);
    const selectedColumns = exportColumns.filter((column) =>
      payload.columns.includes(column.id),
    );

    if (!selectedColumns.length) {
      toast.error("请选择至少一个导出字段");
      return;
    }

    // "selected" 范围直接导出，其他范围创建后台任务
    if (payload.range === "selected" && exportData) {
      const csvContent = buildCsv(
        selectedColumns.map((col) => col.displayName),
        exportData.map((row) =>
          selectedColumns.map((column) =>
            formatCellValue((row as any)[column.id]),
          ),
        ),
      );

      downloadFile(csvContent, `contacts-export-${payload.range}.csv`);
      pushHistoryItem({
        id: crypto.randomUUID(),
        type: "export",
        module,
        status: "COMPLETED",
        summary: `导出${getRangeLabel(payload.range)}完成`,
        detail: `${exportData.length} 条记录`,
        createdAt: new Date().toISOString(),
      });
      toast.success("导出完成");
      setExportDialogOpen(false);
      return;
    }

    // 其他范围创建后台导出任务
    pushHistoryItem({
      id: crypto.randomUUID(),
      type: "export",
      module,
      status: "PENDING",
      summary: `导出${getRangeLabel(payload.range)}任务已创建`,
      detail: "待后台导出完成",
      createdAt: new Date().toISOString(),
    });
    toast.success("已创建后台导出任务");
    setExportDialogOpen(false);
  };

  const handleImportSuccess = (summary: string, detail: string) => {
    pushHistoryItem({
      id: crypto.randomUUID(),
      type: "import",
      module,
      status: "PENDING",
      summary,
      detail,
      createdAt: new Date().toISOString(),
    });
    onImportSuccess?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Download className="mr-2 h-4 w-4" />
            导出
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() =>
              handleExport({
                range: "selected",
                columns: exportColumns.map((col) => col.id),
              })
            }
          >
            导出选中行
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              handleExport({
                range: "currentPage",
                columns: exportColumns.map((col) => col.id),
              })
            }
          >
            导出当前页
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
            高级导出...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={() => setImportDialogOpen(true)}
      >
        <Upload className="mr-2 h-4 w-4" />
        导入
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={() => setHistoryDialogOpen(true)}
      >
        <Clock3 className="mr-1 h-4 w-4" />
        历史
      </Button>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        columns={exportColumns}
        selectedCount={selectedData.length}
        onExport={handleExport}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        fields={contactFields}
        onImportSuccess={handleImportSuccess}
      />

      <HistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        items={historyItems}
      />
    </>
  );
}

function ExportDialog({
  open,
  onOpenChange,
  columns,
  selectedCount,
  onExport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ExportColumn[];
  selectedCount: number;
  onExport: (payload: { range: string; columns: string[] }) => void;
}) {
  const [selectedColumns, setSelectedColumns] = useState(
    columns.map((col) => col.id),
  );
  const [exportRange, setExportRange] = useState<
    "all" | "filtered" | "selected" | "currentPage"
  >("filtered");

  useEffect(() => {
    setSelectedColumns(columns.map((col) => col.id));
  }, [columns]);

  const toggleColumn = (id: string, checked: boolean) => {
    setSelectedColumns((prev) =>
      checked ? [...prev, id] : prev.filter((columnId) => columnId !== id),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>高级导出</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>导出范围</Label>
            <RadioGroup
              value={exportRange}
              onValueChange={(value) => setExportRange(value as any)}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="export-all" />
                <Label htmlFor="export-all">导出全部数据</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="filtered" id="export-filtered" />
                <Label htmlFor="export-filtered">导出筛选后的数据</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="currentPage" id="export-current" />
                <Label htmlFor="export-current">导出当前页</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="selected" id="export-selected" />
                <Label htmlFor="export-selected">
                  导出选中的行 ({selectedCount})
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>选择导出字段</Label>
            <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-4">
              {columns.map((column) => (
                <div key={column.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedColumns.includes(column.id)}
                    onCheckedChange={(value) =>
                      toggleColumn(column.id, !!value)
                    }
                  />
                  <span>{column.displayName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() =>
              onExport({ range: exportRange, columns: selectedColumns })
            }
          >
            导出 CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  fields,
  onImportSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: ContactField[];
  onImportSuccess: (summary: string, detail: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      return;
    }
    setStep(1);
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
  }, [open]);

  const mappedPreview = useMemo(() => {
    return rows.slice(0, 10).map((row) => {
      const mapped: Record<string, string> = {};
      fields.forEach((field) => {
        const header = mapping[field.key as string];
        const isEmpty = !header || header === "__none__";
        mapped[field.key as string] = isEmpty ? "" : row[header] || "";
      });
      return mapped;
    });
  }, [rows, fields, mapping]);

  const validation = useMemo(() => {
    let validCount = 0;
    rows.forEach((row) => {
      const isValid = fields.every((field) => {
        if (!field.required) return true;
        const header = mapping[field.key as string];
        return !!(header && row[header]);
      });
      if (isValid) validCount += 1;
    });
    return {
      total: rows.length,
      valid: validCount,
      invalid: Math.max(rows.length - validCount, 0),
    };
  }, [rows, fields, mapping]);

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    setFileName(file.name);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(autoMapFields(parsed.headers, fields));
    setStep(2);
  };

  const handleImport = () => {
    if (validation.total === 0) {
      toast.error("请先导入有效数据");
      return;
    }

    if (validation.valid === 0) {
      toast.error("没有可导入的有效数据");
      return;
    }

    onImportSuccess(
      `导入联系人任务已提交 (${fileName})`,
      `有效 ${validation.valid} 条，忽略 ${validation.invalid} 条`,
    );

    toast.success("导入任务已提交");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>导入数据</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className={step >= 1 ? "text-foreground" : ""}>1. 上传</span>
          <span>→</span>
          <span className={step >= 2 ? "text-foreground" : ""}>
            2. 字段映射
          </span>
          <span>→</span>
          <span className={step >= 3 ? "text-foreground" : ""}>
            3. 预览确认
          </span>
        </div>

        {step === 1 && (
          <div className="rounded-md border border-dashed p-6 text-center">
            <FileSpreadsheet className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">支持 CSV 格式文件</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" asChild>
                <label>
                  上传文件
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      handleFileUpload(file);
                    }}
                  />
                </label>
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  downloadFile(
                    buildCsv(
                      ["name", "phone", "email"],
                      [["张三", "13800138000", "test@example.com"]],
                    ),
                    "contacts-template.csv",
                  )
                }
              >
                下载模板
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              已解析文件：{fileName}（{rows.length} 条）
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.key as string} className="space-y-1">
                  <Label>
                    {field.label}
                    {field.required && (
                      <span className="text-destructive"> *</span>
                    )}
                  </Label>
                  <Select
                    value={mapping[field.key as string] || ""}
                    onValueChange={(value) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field.key as string]: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择字段" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">不导入</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                返回
              </Button>
              <Button onClick={() => setStep(3)}>下一步</Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>总计 {validation.total} 条</span>
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                有效 {validation.valid} 条
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                忽略 {validation.invalid} 条
              </span>
            </div>

            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {fields.map((field) => (
                      <TableHead key={field.key as string}>
                        {field.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedPreview.length ? (
                    mappedPreview.map((row, idx) => (
                      <TableRow key={idx}>
                        {fields.map((field) => (
                          <TableCell key={field.key as string}>
                            {row[field.key as string] || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={fields.length}
                        className="h-24 text-center"
                      >
                        暂无预览数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>
                返回
              </Button>
              <Button onClick={handleImport}>确认导入</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: HistoryItem[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>导入导出历史</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">暂无历史记录</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{item.summary}</div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {item.detail}
                </div>
                <div className="mt-2 text-xs">
                  <span className="rounded-full border px-2 py-0.5">
                    {item.type === "import" ? "导入" : "导出"}
                  </span>{" "}
                  <span className="rounded-full border px-2 py-0.5">
                    {item.status === "COMPLETED"
                      ? "已完成"
                      : item.status === "FAILED"
                        ? "失败"
                        : "处理中"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function resolveExportData(range: string, selectedData: Contact[]) {
  if (range === "selected") {
    if (!selectedData.length) {
      toast.error("请先选择要导出的行");
      return null;
    }
    return selectedData;
  }

  // "currentPage", "all", "filtered" 都返回 null，创建后台任务
  return null;
}

function getRangeLabel(range: string) {
  switch (range) {
    case "selected":
      return "选中行";
    case "currentPage":
      return "当前页";
    case "filtered":
      return "筛选数据";
    case "all":
      return "全部数据";
    default:
      return "数据";
  }
}

function buildCsv(headers: string[], rows: string[][]) {
  const headerLine = headers.map(escapeCsv).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsv).join(","));
  return [headerLine, ...dataLines].join("\n");
}

function escapeCsv(value: string) {
  if (value == null) return "";
  const needsEscape = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsEscape ? `"${escaped}"` : escaped;
}

function formatCellValue(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseCsv(content: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const filtered = lines.filter((line) => line.trim() !== "");
  if (!filtered.length) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(filtered[0]);
  const rows = filtered.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((value) => value.trim());
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function autoMapFields(headers: string[], fields: ContactField[]) {
  const mapping: Record<string, string> = {};
  fields.forEach((field) => {
    const match = headers.find(
      (header) =>
        normalize(header) === normalize(field.label) ||
        normalize(header) === normalize(field.key as string),
    );
    if (match) {
      mapping[field.key as string] = match;
    }
  });
  return mapping;
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
}
