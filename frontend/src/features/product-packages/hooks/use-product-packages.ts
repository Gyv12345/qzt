import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";

// 分页参数类型
export interface ProductPackageParams {
  includeProducts?: boolean;
}

// 获取产品套餐列表
export function useProductPackages(params?: ProductPackageParams) {
  return useQuery({
    queryKey: ["product-packages", params],
    queryFn: async () => {
      const { productPackageControllerFindAll } = getScrmApi();
      return await productPackageControllerFindAll(params || {});
    },
  });
}

// 获取产品套餐详情
export function useProductPackage(id: string) {
  return useQuery({
    queryKey: ["product-packages", id],
    queryFn: async () => {
      const { productPackageControllerFindOne } = getScrmApi();
      return await productPackageControllerFindOne(id);
    },
    enabled: !!id,
  });
}

// 创建产品套餐
export function useCreateProductPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      price: number;
      originalPrice?: number;
    }) => {
      const { productPackageControllerCreate } = getScrmApi();
      return await productPackageControllerCreate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-packages"] });
      toast.success("产品套餐已创建");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "创建失败，请重试");
    },
  });
}

// 更新产品套餐
export function useUpdateProductPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        description?: string;
        price?: number;
        originalPrice?: number;
      };
    }) => {
      const { productPackageControllerUpdate } = getScrmApi();
      return await productPackageControllerUpdate(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-packages"] });
      toast.success("产品套餐已更新");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "更新失败，请重试");
    },
  });
}

// 删除产品套餐
export function useDeleteProductPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { productPackageControllerRemove } = getScrmApi();
      return await productPackageControllerRemove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-packages"] });
      toast.success("产品套餐已删除");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "删除失败，请重试");
    },
  });
}

// 添加产品到套餐
export function useAddProductToPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      packageId,
      productId,
    }: {
      packageId: string;
      productId: string;
    }) => {
      const { productPackageControllerAddProduct } = getScrmApi();
      return await productPackageControllerAddProduct(packageId, productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-packages"] });
      toast.success("产品已添加到套餐");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "添加失败，请重试");
    },
  });
}

// 从套餐中移除产品
export function useRemoveProductFromPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      packageId,
      productId,
    }: {
      packageId: string;
      productId: string;
    }) => {
      const { productPackageControllerRemoveProduct } = getScrmApi();
      return await productPackageControllerRemoveProduct(packageId, productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-packages"] });
      toast.success("产品已从套餐移除");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "移除失败，请重试");
    },
  });
}
