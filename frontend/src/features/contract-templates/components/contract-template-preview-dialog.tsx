import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { usePreviewContractTemplate } from "../hooks/use-contract-templates";
import type { ContractTemplate } from "../types/contract-template";

interface ContractTemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ContractTemplate | null;
}

// 示例变量数据
const SAMPLE_VARIABLES = {
  customerName: "示例客户有限公司",
  customerShortName: "示例客户",
  contractNo: "CT20250208001",
  contractName: "软件开发服务合同",
  contractAmount: "100,000.00",
  signDate: "2025-02-08",
  startDate: "2025-03-01",
  endDate: "2026-02-28",
  productName: "企业管理系统",
  productCode: "QZT-ENT-001",
  productPrice: "50,000.00",
  productQuantity: "2",
  companyName: "企智通科技有限公司",
  companyAddress: "北京市朝阳区示例路123号",
  companyPhone: "400-123-4567",
  userName: "张三",
};

export function ContractTemplatePreviewDialog({
  open,
  onOpenChange,
  template,
}: ContractTemplatePreviewDialogProps) {
  const [previewContent, setPreviewContent] = useState(template?.content || "");
  const previewMutation = usePreviewContractTemplate();

  const handlePreview = async () => {
    if (!template) return;

    try {
      const result = await previewMutation.mutateAsync({
        id: template.id,
        variables: SAMPLE_VARIABLES,
      });
      if (result?.previewContent) {
        setPreviewContent(result.previewContent);
      }
    } catch (error) {
      console.error("预览失败:", error);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${template?.name || "合同预览"}</title>
          <style>
            body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; line-height: 1.6; }
            h1, h2, h3 { margin-top: 0; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .variable-tag { background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
          </style>
        </head>
        <body>
          ${previewContent}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    const blob = new Blob([previewContent], {
      type: "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${template?.name || "合同模板"}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 当对话框打开或模板改变时，重置预览内容
  if (template && previewContent !== template.content) {
    setPreviewContent(template.content);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{template?.name || "合同预览"}</DialogTitle>
          <DialogDescription>
            预览合同模板内容，变量已替换为示例数据
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-md p-4 bg-background">
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <p>示例数据已应用，实际使用时将替换为真实数据</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={previewMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              刷新预览
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              下载
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              打印
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
