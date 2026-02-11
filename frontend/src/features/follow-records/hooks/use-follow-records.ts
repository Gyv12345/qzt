import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getScrmApi } from "@/services/api";
import type {
  FollowRecordQueryParams,
  FollowRecordListResponse,
  FollowRecordItem,
} from "../types/follow-record";
import type { CreateFollowRecordDto, UpdateFollowRecordDto } from "@/models";

/** 跟进记录查询 Key */
export const followRecordsKeys = {
  all: ["follow-records"] as const,
  lists: () => [...followRecordsKeys.all, "list"] as const,
  list: (params: FollowRecordQueryParams) =>
    [...followRecordsKeys.lists(), params] as const,
  details: () => [...followRecordsKeys.all, "detail"] as const,
  detail: (id: string) => [...followRecordsKeys.details(), id] as const,
};

/** 获取跟进记录列表 */
export function useFollowRecords(params: FollowRecordQueryParams = {}) {
  const { customerId, page = 1, pageSize = 10 } = params;

  return useQuery({
    queryKey: followRecordsKeys.list({ customerId, page, pageSize }),
    queryFn: async () => {
      const api = getScrmApi();
      const result = await api.followRecordControllerFindAll({
        customerId: customerId!,
        page,
        pageSize,
      });
      return result as unknown as FollowRecordListResponse;
    },
    enabled: !!customerId,
  });
}

/** 获取跟进记录详情 */
export function useFollowRecord(id: string) {
  return useQuery({
    queryKey: followRecordsKeys.detail(id),
    queryFn: async () => {
      const api = getScrmApi();
      const result = await api.followRecordControllerFindOne(id);
      return result as unknown as FollowRecordItem;
    },
    enabled: !!id,
  });
}

/** 创建跟进记录 */
export function useCreateFollowRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFollowRecordDto) => {
      const api = getScrmApi();
      return await api.followRecordControllerCreate(data);
    },
    onSuccess: (_, variables) => {
      // 使列表缓存失效
      queryClient.invalidateQueries({
        queryKey: followRecordsKeys.lists(),
      });
      // 使特定客户的跟进记录缓存失效
      if (variables.customerId) {
        queryClient.invalidateQueries({
          queryKey: followRecordsKeys.list({
            customerId: variables.customerId,
          }),
        });
      }
    },
  });
}

/** 更新跟进记录 */
export function useUpdateFollowRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateFollowRecordDto;
    }) => {
      const api = getScrmApi();
      return await api.followRecordControllerUpdate(id, data);
    },
    onSuccess: (_, variables) => {
      // 使详情缓存失效
      queryClient.invalidateQueries({
        queryKey: followRecordsKeys.detail(variables.id),
      });
      // 使列表缓存失效
      queryClient.invalidateQueries({
        queryKey: followRecordsKeys.lists(),
      });
    },
  });
}

/** 删除跟进记录 */
export function useDeleteFollowRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const api = getScrmApi();
      return await api.followRecordControllerRemove(id);
    },
    onSuccess: () => {
      // 使列表缓存失效
      queryClient.invalidateQueries({
        queryKey: followRecordsKeys.lists(),
      });
    },
  });
}
