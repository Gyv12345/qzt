import { useState } from "react";
import { Edit2, Trash2, LoaderCircle, GitBranch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProducts } from "@/features/products/hooks/use-products";
import {
  useProductFlows,
  useDeleteProductFlow,
  useToggleProductFlow,
} from "../hooks/use-product-flows";
import { ProductFlowFormDialog } from "./product-flow-form-dialog";
import { FlowNodesManager } from "./flow-nodes-manager";

interface ProductFlowsTableProps {
  onEdit?: (record: any) => void;
}

export function ProductFlowsTable({ onEdit }: ProductFlowsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const { data: productsData } = useProducts({ page: 1, pageSize: 100 });
  const deleteMutation = useDeleteProductFlow();
  const toggleMutation = useToggleProductFlow();

  const products = productsData?.data || [];

  // 获取选中产品的流程
  const {
    data: flowsData,
    isLoading,
    refetch,
  } = useProductFlows(selectedProductId);
  const flows = flowsData || [];

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      refetch();
    }
  };

  const handleToggle = async (id: string) => {
    await toggleMutation.mutateAsync(id);
    refetch();
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setFormOpen(true);
  };

  return (
    <>
      <Tabs
        value={selectedProductId || "all"}
        onValueChange={(v) => setSelectedProductId(v === "all" ? "" : v)}
      >
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all">全部产品</TabsTrigger>
            {products.slice(0, 5).map((product: any) => (
              <TabsTrigger key={product.id} value={product.id}>
                {product.name}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button size="sm" onClick={handleAdd} disabled={!selectedProductId}>
            <Plus className="h-4 w-4 mr-1" />
            创建流程
          </Button>
        </div>

        {!selectedProductId ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">请选择一个产品查看其流程</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : flows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">该产品暂无流程配置</p>
              <Button variant="outline" className="mt-4" onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-1" />
                创建第一个流程
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {flows.map((flow: any) => (
              <Card key={flow.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{flow.name}</h3>
                        <Badge
                          variant={flow.isActive ? "default" : "secondary"}
                        >
                          {flow.isActive ? "启用" : "禁用"}
                        </Badge>
                      </div>
                      {flow.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {flow.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{flow.nodes?.length || 0} 个节点</span>
                        <span>
                          创建于 {new Date(flow.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={flow.isActive}
                        onCheckedChange={() => handleToggle(flow.id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(flow)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteId(flow.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Tabs>

      <ProductFlowFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingRecord={editingRecord}
        productId={selectedProductId}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该产品流程吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
