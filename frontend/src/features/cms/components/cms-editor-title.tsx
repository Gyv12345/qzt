/**
 * CMS 编辑器标题输入组件
 * 大标题样式，支持自动生成 slug
 */

import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import type { CmsEditorValues } from "./cms-content-editor";

interface CmsEditorTitleProps {
  form: UseFormReturn<CmsEditorValues>;
}

export function CmsEditorTitle({ form }: CmsEditorTitleProps) {
  // 自动生成 slug
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\u4e00-\u9fa5a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleTitleChange = (value: string) => {
    form.setValue("title", value);
    const currentSlug = form.getValues("slug");
    // 只在 slug 为空或自动生成的情况下更新
    if (!currentSlug) {
      form.setValue("slug", generateSlug(value));
    }
  };

  return (
    <FormField
      control={form.control}
      name="title"
      render={({ field }) => (
        <FormItem>
          <input
            type="text"
            placeholder="输入标题..."
            className={`
              w-full bg-transparent text-4xl font-bold
              placeholder:text-muted-foreground/40
              focus:outline-none
              [&::-webkit-input-placeholder]:text-muted-foreground/40
            `}
            value={field.value}
            onChange={(e) => {
              handleTitleChange(e.target.value);
              field.onChange(e);
            }}
            autoFocus
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
