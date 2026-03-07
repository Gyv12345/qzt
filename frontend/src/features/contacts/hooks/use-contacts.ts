import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import type { CreateContactDto, UpdateContactDto } from "@/models";

export function useContacts(params?: {
  page?: number;
  pageSize?: number;
  customerId?: string;
}) {
  return useQuery({
    queryKey: ["contacts", params],
    queryFn: async () => {
      const { contactControllerFindAll } = getScrmApi();
      const response = (await contactControllerFindAll(params)) as any;
      // 后端返回的是 data 字段，转换为 items 以保持一致性
      return {
        ...response,
        items: response.data || [],
      };
    },
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      const { contactControllerFindOne } = getScrmApi();
      return (await contactControllerFindOne(id)) as any;
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateContactDto) => {
      const { contactControllerCreate } = getScrmApi();
      return await contactControllerCreate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("联系人创建成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "创建失败");
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateContactDto;
    }) => {
      const { contactControllerUpdate } = getScrmApi();
      return await contactControllerUpdate(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("联系人更新成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "更新失败");
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { contactControllerRemove } = getScrmApi();
      return await contactControllerRemove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("联系人删除成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "删除失败");
    },
  });
}

export function useLinkCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      data,
    }: {
      contactId: string;
      data: any;
    }) => {
      const api = getScrmApi();
      // API 方法签名：linkCompany(id: string, linkDto: LinkCompanyDto)
      return await api.contactControllerLinkCompany(contactId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("关联客户成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "关联失败");
    },
  });
}

export function useUnlinkCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      customerId,
    }: {
      contactId: string;
      customerId: string;
    }) => {
      const api = getScrmApi();
      // API 方法签名：unlinkCompany(id: string, customerId: string)
      return await api.contactControllerUnlinkCompany(contactId, customerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("取消关联成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "取消关联失败");
    },
  });
}
