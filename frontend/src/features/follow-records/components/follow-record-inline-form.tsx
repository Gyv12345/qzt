import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  followRecordSchema,
  FOLLOW_TYPE_OPTIONS,
  type FollowRecord,
} from "../types/follow-record";
import { useCreateFollowRecord } from "../hooks/use-follow-records";
import type { CreateFollowRecordDto } from "@/models";

type FollowRecordInlineFormProps = {
  customerId: string;
  customerName?: string;
  onSuccess?: () => void;
};

export function FollowRecordInlineForm({
  customerId,
  customerName,
  onSuccess,
}: FollowRecordInlineFormProps) {
  const form = useForm<FollowRecord>({
    resolver: zodResolver(followRecordSchema),
    defaultValues: {
      customerId,
      type: undefined,
      content: "",
      nextTime: "",
      images: "",
    },
  });

  const createMutation = useCreateFollowRecord();

  const handleSubmit = async (data: FollowRecord) => {
    try {
      await createMutation.mutateAsync(data as CreateFollowRecordDto);
      onSuccess?.();
      form.reset();
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium">新建跟进记录</CardTitle>
        {customerName && (
          <p className="text-sm text-muted-foreground">客户: {customerName}</p>
        )}
      </CardHeader>
      <CardContent>
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
                    value={field.value?.toString()}
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
                      rows={3}
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
                          type="button"
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

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
