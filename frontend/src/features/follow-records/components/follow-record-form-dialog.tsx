import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  followRecordSchema,
  FOLLOW_TYPE_OPTIONS,
  type FollowRecord,
} from "../types/follow-record";
import {
  useCreateFollowRecord,
  useUpdateFollowRecord,
} from "../hooks/use-follow-records";
import type { CreateFollowRecordDto, UpdateFollowRecordDto } from "@/models";

type FollowRecordFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName?: string;
  record?: FollowRecord;
  onSuccess?: () => void;
};

export function FollowRecordFormDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  record,
  onSuccess,
}: FollowRecordFormDialogProps) {
  const isEdit = !!record;

  const form = useForm<FollowRecord>({
    resolver: zodResolver(followRecordSchema),
    defaultValues: {
      customerId,
      type: record?.type || undefined,
      content: record?.content || "",
      nextTime: record?.nextTime || "",
      images: record?.images || "",
    },
  });

  const createMutation = useCreateFollowRecord();
  const updateMutation = useUpdateFollowRecord();

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (data: FollowRecord) => {
    try {
      if (isEdit && record?.id) {
        await updateMutation.mutateAsync({
          id: record.id,
          data: data as UpdateFollowRecordDto,
        });
      } else {
        await createMutation.mutateAsync(data as CreateFollowRecordDto);
      }
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑跟进记录" : "新建跟进记录"}</DialogTitle>
          <DialogDescription>
            {customerName ? `客户: ${customerName}` : "请填写跟进信息"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* 跟进类型 */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>跟进类型</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择跟进类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FOLLOW_TYPE_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value.toString()}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 跟进内容 */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>跟进内容</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入跟进内容..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 下次跟进时间 */}
            <FormField
              control={form.control}
              name="nextTime"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>下次跟进时间</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(new Date(field.value), "yyyy-MM-dd HH:mm")
                          ) : (
                            <span>选择日期时间</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            // 保留时间部分或设置默认时间
                            const current = field.value
                              ? new Date(field.value)
                              : new Date();
                            date.setHours(
                              current.getHours(),
                              current.getMinutes(),
                            );
                            field.onChange(date.toISOString());
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                取消
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "保存中..." : isEdit ? "保存" : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
