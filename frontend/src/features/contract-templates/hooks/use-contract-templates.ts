import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import type {
  CreateContractTemplateDto,
  UpdateContractTemplateDto,
} from "@/models";

// 合同模板列表查询
export function useContractTemplates() {
  return useQuery({
    queryKey: ["contract-templates"],
    queryFn: async () => {
      const { contractTemplateControllerFindAll } = getScrmApi();
      return (await contractTemplateControllerFindAll()) as any;
    },
  });
}

// 合同模板详情查询
export function useContractTemplate(id: string) {
  return useQuery({
    queryKey: ["contract-template", id],
    queryFn: async () => {
      const { contractTemplateControllerFindOne } = getScrmApi();
      return (await contractTemplateControllerFindOne(id)) as any;
    },
    enabled: !!id,
  });
}

// 合同模板变量查询
export function useContractTemplateVariables(id: string) {
  return useQuery({
    queryKey: ["contract-template-variables", id],
    queryFn: async () => {
      const { contractTemplateControllerGetVariables } = getScrmApi();
      return (await contractTemplateControllerGetVariables(
        id,
      )) as unknown as any[];
    },
    enabled: !!id,
  });
}

// 创建合同模板
export function useCreateContractTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateContractTemplateDto) => {
      const { contractTemplateControllerCreate } = getScrmApi();
      return await contractTemplateControllerCreate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("合同模板创建成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "创建失败");
    },
  });
}

// 更新合同模板
export function useUpdateContractTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateContractTemplateDto;
    }) => {
      const { contractTemplateControllerUpdate } = getScrmApi();
      return await contractTemplateControllerUpdate(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("合同模板更新成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "更新失败");
    },
  });
}

// 删除合同模板
export function useDeleteContractTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { contractTemplateControllerRemove } = getScrmApi();
      return await contractTemplateControllerRemove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("合同模板删除成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "删除失败");
    },
  });
}

// 预览合同模板
export function usePreviewContractTemplate() {
  return useMutation({
    mutationFn: async ({
      id,
      variables,
    }: {
      id: string;
      variables: Record<string, any>;
    }) => {
      const { contractTemplateControllerPreview } = getScrmApi();
      return (await contractTemplateControllerPreview(id, {
        variables,
      })) as any;
    },
    onError: (error: any) => {
      toast.error(error.message || "预览失败");
    },
  });
}
