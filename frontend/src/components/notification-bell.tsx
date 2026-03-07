import { useState } from "react";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getScrmApi } from "@/services/api";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // 获取未读通知数量
  const { data: unreadCount } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const { notificationControllerGetUnreadCount } = getScrmApi();
      const response = await notificationControllerGetUnreadCount();
      return response;
    },
    refetchInterval: 30000, // 每30秒刷新一次
  });

  // 获取通知列表
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      const { notificationControllerGetUserNotifications } = getScrmApi();
      const response = await notificationControllerGetUserNotifications({});
      return response as Notification[];
    },
    enabled: isOpen,
  });

  // 标记为已读
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { notificationControllerMarkAsRead } = getScrmApi();
      await notificationControllerMarkAsRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // 全部标记为已读
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { notificationControllerMarkAllAsRead } = getScrmApi();
      await notificationControllerMarkAllAsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // 删除通知
  const deleteMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { notificationControllerDeleteNotification } = getScrmApi();
      await notificationControllerDeleteNotification(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const count = (unreadCount as any)?.count || 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">通知中心</h4>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              全部已读
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">加载中...</div>
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Bell className="h-12 w-12 text-muted-foreground mb-2" />
              <div className="text-sm text-muted-foreground">暂无通知</div>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "relative p-4 hover:bg-accent/50 cursor-pointer transition-colors",
                    !notification.isRead && "bg-blue-50/50 dark:bg-blue-950/20",
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
                        <h5 className="font-medium text-sm truncate">
                          {notification.title}
                        </h5>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                        {notification.content}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        {format(
                          new Date(notification.createdAt),
                          "MM-dd HH:mm",
                          { locale: zhCN },
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notification.id);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(notification.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
