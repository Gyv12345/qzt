import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import type { CreateProductDto, UpdateProductDto } from "@/models";

// 产品列表查询
export function useProducts(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => {
      const { productControllerFindAll } = getScrmApi();
      return (await productControllerFindAll(params)) as any;
    },
  });
}

// 产品详情查询
export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { productControllerFindOne } = getScrmApi();
      return (await productControllerFindOne(id)) as any;
    },
    enabled: !!id,
  });
}

// 创建产品
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductDto) => {
      const { productControllerCreate } = getScrmApi();
      return await productControllerCreate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("产品创建成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "创建失败");
    },
  });
}

// 更新产品
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateProductDto;
    }) => {
      const { productControllerUpdate } = getScrmApi();
      return await productControllerUpdate(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("产品更新成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "更新失败");
    },
  });
}

// 删除产品
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { productControllerRemove } = getScrmApi();
      return await productControllerRemove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("产品删除成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "删除失败");
    },
  });
}
