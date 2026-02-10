/**
 * 社交媒体内容编辑/创建抽屉
 */

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useSocialMediaAccounts } from "../hooks/use-social-media";
import type { SocialMediaPost } from "../types/social-media";

const formSchema = z.object({
  accountId: z.string().min(1, "请选择发布账号"),
  title: z.string().min(1, "请输入标题"),
  content: z.string().min(1, "请输入内容"),
  topics: z.string().optional(),
  location: z.string().optional(),
  visibility: z.enum(["public", "friends", "private"]),
  scheduledAt: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SocialPostEditorDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => void | Promise<void>;
  editingPost?: SocialMediaPost | null;
  loading?: boolean;
}

export function SocialPostEditorDrawer({
  open,
  onClose,
  onSubmit,
  editingPost,
  loading = false,
}: SocialPostEditorDrawerProps) {
  const [topics, setTopics] = useState<string[]>([]);
  const [currentTopic, setCurrentTopic] = useState("");

  const { data: accounts } = useSocialMediaAccounts();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: "",
      title: "",
      content: "",
      topics: "",
      location: "",
      visibility: "public",
      scheduledAt: "",
    },
  });

  useEffect(() => {
    if (editingPost) {
      form.reset({
        accountId: editingPost.accountId,
        title: editingPost.title,
        content: editingPost.content || "",
        topics: editingPost.topics || "",
        location: editingPost.location || "",
        visibility: editingPost.visibility,
        scheduledAt: editingPost.scheduledAt
          ? new Date(editingPost.scheduledAt).toISOString()
          : "",
      });
      if (editingPost.topics) {
        try {
          setTopics(JSON.parse(editingPost.topics));
        } catch {
          setTopics([]);
        }
      }
    } else {
      form.reset();
      setTopics([]);
    }
  }, [editingPost, form, open]);

  const handleSubmit = async (values: FormValues) => {
    const data = {
      ...values,
      topics: topics.length > 0 ? JSON.stringify(topics) : undefined,
    };
    await onSubmit(data);
  };

  const handleAddTopic = () => {
    if (currentTopic.trim() && !topics.includes(currentTopic.trim())) {
      setTopics([...topics, currentTopic.trim()]);
      setCurrentTopic("");
    }
  };

  const handleRemoveTopic = (topic: string) => {
    setTopics(topics.filter((t) => t !== topic));
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="max-h-[85vh] w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editingPost ? "编辑内容" : "创建新内容"}</SheetTitle>
          <SheetDescription>
            {editingPost
              ? "修改新媒体内容并发布到各平台"
              : "创建新媒体内容并发布到抖音、小红书、微信视频号等平台"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="post-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 overflow-y-auto px-4 pb-4"
          >
            {/* 账号选择 */}
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>发布账号</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择要发布的账号" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts?.data?.map((account: any) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 标题 */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标题</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="输入内容标题"
                      {...field}
                      maxLength={100}
                    />
                  </FormControl>
                  <FormDescription>
                    标题将显示在各平台的标题位置
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 内容 */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>内容</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="输入内容文案，支持话题标签 #话题名"
                      className="min-h-[150px]"
                      {...field}
                      maxLength={5000}
                    />
                  </FormControl>
                  <FormDescription>
                    支持 Markdown 格式，最多 5000 字符
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 话题标签 */}
            <div className="space-y-2">
              <FormLabel>话题标签</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="输入话题标签（如 #干货分享）"
                  value={currentTopic}
                  onChange={(e) => setCurrentTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTopic();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTopic}
                >
                  添加
                </Button>
              </div>
              {topics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="gap-1">
                      #{topic}
                      <button
                        type="button"
                        onClick={() => handleRemoveTopic(topic)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 位置 */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>位置信息（可选）</FormLabel>
                  <FormControl>
                    <Input placeholder="添加位置信息" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 可见性 */}
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>可见性</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="public">公开</SelectItem>
                      <SelectItem value="friends">好友可见</SelectItem>
                      <SelectItem value="private">私密</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 定时发布 */}
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>定时发布（可选）</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {field.value ? (
                            format(new Date(field.value), "yyyy-MM-dd HH:mm")
                          ) : (
                            <span>选择发布时间</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
                            const now = new Date();
                            date.setHours(now.getHours() + 1, 0, 0, 0);
                            field.onChange(date.toISOString());
                          } else {
                            field.onChange("");
                          }
                        }}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    留空则立即发布，选择时间则定时发布
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <SheetFooter className="px-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              取消
            </Button>
            <Button
              form="post-form"
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPost ? "保存" : "创建"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
