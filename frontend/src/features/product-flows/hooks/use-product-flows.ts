import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";

// ==================== 流程管理 ====================

// 获取产品的所有流程
export function useProductFlows(productId?: string) {
  return useQuery({
    queryKey: ["product-flows", "product", productId],
    queryFn: async () => {
      const { productFlowControllerFindByProduct } = getScrmApi();
      return await productFlowControllerFindByProduct(productId || "");
    },
    enabled: !!productId,
  });
}

// 获取流程详情
export function useProductFlow(id: string) {
  return useQuery({
    queryKey: ["product-flows", id],
    queryFn: async () => {
      const { productFlowControllerFindOne } = getScrmApi();
      return await productFlowControllerFindOne(id);
    },
    enabled: !!id,
  });
}

// 创建产品流程
export function useCreateProductFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      productId: string;
      name: string;
      description?: string;
    }) => {
      const { productFlowControllerCreate } = getScrmApi();
      return await productFlowControllerCreate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-flows"] });
      toast.success("产品流程已创建");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "创建失败，请重试");
    },
  });
}

// 更新流程
export function useUpdateProductFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string };
    }) => {
      const { productFlowControllerUpdate } = getScrmApi();
      return await productFlowControllerUpdate(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-flows"] });
      toast.success("产品流程已更新");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "更新失败，请重试");
    },
  });
}

// 删除流程
export function useDeleteProductFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { productFlowControllerRemove } = getScrmApi();
      return await productFlowControllerRemove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-flows"] });
      toast.success("产品流程已删除");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "删除失败，请重试");
    },
  });
}

// 启用/禁用流程
export function useToggleProductFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { productFlowControllerToggle } = getScrmApi();
      return await productFlowControllerToggle(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-flows"] });
      toast.success("流程状态已更新");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "操作失败，请重试");
    },
  });
}

// ==================== 节点管理 ====================

// 添加节点到流程
export function useAddFlowNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      flowId,
      data,
    }: {
      flowId: string;
      data: {
        name: string;
        description?: string;
        actionType?: string;
        order?: number;
      };
    }) => {
      const { productFlowControllerAddNode } = getScrmApi();
      return await productFlowControllerAddNode(flowId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-flows"] });
      toast.success("节点已添加");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "添加失败，请重试");
    },
  });
}

// 更新节点
export function useUpdateFlowNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      nodeId,
      data,
    }: {
      nodeId: string;
      data: {
        name?: string;
        description?: string;
        actionType?: string;
        order?: number;
      };
    }) => {
      const { productFlowControllerUpdateNode } = getScrmApi();
      return await productFlowControllerUpdateNode(nodeId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-flows"] });
      toast.success("节点已更新");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "更新失败，请重试");
    },
  });
}

// 删除节点
export function useDeleteFlowNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nodeId: string) => {
      const { productFlowControllerRemoveNode } = getScrmApi();
      return await productFlowControllerRemoveNode(nodeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-flows"] });
      toast.success("节点已删除");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "删除失败，请重试");
    },
  });
}

// ==================== 执行记录管理 ====================

// 获取流程执行记录
export function useFlowExecutions() {
  return useQuery({
    queryKey: ["flow-executions"],
    queryFn: async () => {
      const { productFlowControllerFindExecutions } = getScrmApi();
      return await productFlowControllerFindExecutions();
    },
  });
}

// 创建流程执行记录
export function useCreateFlowExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { flowId: string; contractId: string }) => {
      const { productFlowControllerCreateExecution } = getScrmApi();
      return await productFlowControllerCreateExecution(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flow-executions"] });
      toast.success("执行记录已创建");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "创建失败，请重试");
    },
  });
}

// 更新执行状态
export function useUpdateExecutionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      executionId,
      status,
    }: {
      executionId: string;
      status: string;
    }) => {
      const { productFlowControllerUpdateExecutionStatus } = getScrmApi();
      return await productFlowControllerUpdateExecutionStatus(executionId, {
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flow-executions"] });
      toast.success("执行状态已更新");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "更新失败，请重试");
    },
  });
}

// 获取待执行的流程节点
export function usePendingFlowNodes(contractId: string) {
  return useQuery({
    queryKey: ["flow-executions", "pending", contractId],
    queryFn: async () => {
      const { productFlowControllerFindPendingNodes } = getScrmApi();
      return await productFlowControllerFindPendingNodes(contractId);
    },
    enabled: !!contractId,
  });
}
