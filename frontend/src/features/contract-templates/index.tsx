import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ContractTemplatesTable } from "./components/contract-templates-table";
import { ContractTemplateFormDrawer } from "./components/contract-template-form-drawer";
import { ContractTemplatesPrimaryButtons } from "./components/contract-templates-primary-buttons";
import { ContractTemplatePreviewDialog } from "./components/contract-template-preview-dialog";
import type { ContractTemplate } from "./types/contract-template";

export function ContractTemplatesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<
    ContractTemplate | undefined
  >();
  const [previewingTemplate, setPreviewingTemplate] =
    useState<ContractTemplate | null>(null);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
  }, [queryClient]);

  const handleCreate = useCallback(() => {
    setEditingTemplate(undefined);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((template: ContractTemplate) => {
    setEditingTemplate(template);
    setFormOpen(true);
  }, []);

  const handlePreview = useCallback((template: ContractTemplate) => {
    setPreviewingTemplate(template);
    setPreviewOpen(true);
  }, []);

  const handleFormSuccess = useCallback(() => {
    handleRefresh();
    setFormOpen(false);
  }, [handleRefresh]);

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* 页面标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">合同模板管理</h1>
          <p className="text-muted-foreground">
            管理合同模板，支持变量插入和富文本编辑
          </p>
        </div>
        <ContractTemplatesPrimaryButtons onCreate={handleCreate} />
      </div>

      {/* 数据表格 */}
      <ContractTemplatesTable
        onEdit={handleEdit}
        onPreview={handlePreview}
        onRefresh={handleRefresh}
      />

      {/* 表单抽屉 */}
      <ContractTemplateFormDrawer
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editingTemplate}
        onSuccess={handleFormSuccess}
      />

      {/* 预览对话框 */}
      <ContractTemplatePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        template={previewingTemplate}
      />
    </div>
  );
}
