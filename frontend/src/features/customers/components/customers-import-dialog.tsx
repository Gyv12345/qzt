import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";

interface CustomersImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ImportError {
  row: number;
  message: string;
}

export function CustomersImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: CustomersImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [result, setResult] = useState<{ success: number; failed: number }>({
    success: 0,
    failed: 0,
  });

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      if (
        !selectedFile.name.endsWith(".xlsx") &&
        !selectedFile.name.endsWith(".xls")
      ) {
        toast.error("请选择 Excel 文件");
        return;
      }

      setFile(selectedFile);

      // 读取预览数据
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // 提取前 5 行作为预览（跳过可能的表头）
          const preview = (jsonData as any[][])
            .slice(1, 6)
            .filter((row) => row.length > 0)
            .map((row) => ({
              name: row[0] || "",
              shortName: row[1] || "",
              code: row[2] || "",
              industry: row[3] || "",
              customerLevel: row[7] || "LEAD",
            }))
            .filter((item) => item.name);

          setPreviewData(preview);
          setStep("preview");
        } catch (error) {
          toast.error("文件解析失败");
        }
      };
      reader.readAsBinaryString(selectedFile);
    },
    [],
  );

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const { customerControllerDownloadImportTemplate } = getScrmApi();
      const response = await customerControllerDownloadImportTemplate();

      // 创建 blob 并下载
      const blob = new Blob([response as any], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "customer_import_template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("模板下载成功");
    } catch (error) {
      toast.error("模板下载失败");
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { customerControllerImportCustomers } = getScrmApi();
      // 后端 API 缺少 @ApiBody 装饰器，Orval 未正确生成参数类型
      // TODO: 后端添加 @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
      const response = (await customerControllerImportCustomers()) as any;

      setResult({
        success: response.success || 0,
        failed: response.failed || 0,
      });

      if (response.errors && response.errors.length > 0) {
        setErrors(
          response.errors.map((err: string, idx: number) => ({
            row: idx + 2,
            message: err,
          })),
        );
      }

      setStep("result");

      if (response.success > 0) {
        toast.success(`成功导入 ${response.success} 条客户数据`);
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || "导入失败");
      setStep("upload");
    } finally {
      setIsUploading(false);
    }
  }, [file, onSuccess]);

  const handleReset = useCallback(() => {
    setFile(null);
    setPreviewData([]);
    setErrors([]);
    setResult({ success: 0, failed: 0 });
    setStep("upload");
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onOpenChange(false);
  }, [handleReset, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>批量导入客户</DialogTitle>
          <DialogDescription>
            {step === "upload" && "上传 Excel 文件批量导入客户数据"}
            {step === "preview" && "预览将要导入的数据"}
            {step === "result" && "导入完成"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {step === "upload" && (
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    点击上传或拖拽文件到此处
                  </p>
                  <p className="text-xs text-muted-foreground">
                    支持 .xlsx、.xls 格式，最大 5MB
                  </p>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  <span className="text-sm">没有模板？</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="h-4 w-4 mr-2" />
                  下载模板
                </Button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground">
                找到 {previewData.length} 条数据（预览前 5 条）
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">公司名称</th>
                      <th className="px-4 py-2 text-left">简称</th>
                      <th className="px-4 py-2 text-left">客户编码</th>
                      <th className="px-4 py-2 text-left">客户等级</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2">{item.shortName || "-"}</td>
                        <td className="px-4 py-2">{item.code || "-"}</td>
                        <td className="px-4 py-2">{item.customerLevel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {file && (
                <div className="text-sm text-muted-foreground">
                  文件: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
          )}

          {step === "result" && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {result.success}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    成功导入
                  </div>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {result.failed}
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400">
                    导入失败
                  </div>
                </div>
              </div>

              {errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">导入错误</h4>
                  <div className="max-h-40 overflow-auto border rounded-lg p-2">
                    {errors.map((error, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-red-600 dark:text-red-400"
                      >
                        第 {error.row} 行: {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={handleReset}>
                重新选择
              </Button>
              <Button onClick={handleImport} disabled={isUploading}>
                {isUploading ? "导入中..." : "开始导入"}
              </Button>
            </>
          )}
          {step === "result" && (
            <>
              <Button variant="outline" onClick={handleReset}>
                继续导入
              </Button>
              <Button onClick={handleClose}>完成</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
