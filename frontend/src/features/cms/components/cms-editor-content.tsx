/**
 * CMS TipTap 富文本编辑器
 * 支持常用富文本格式、列表、链接、图片等
 */

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator as SeparatorComponent } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

interface CmsEditorContentProps {
  content: string;
  onChange: (content: string) => void;
  wordCount: number;
}

export function CmsEditorContent({
  content,
  onChange,
}: Omit<CmsEditorContentProps, "wordCount">) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder: "开始撰写您的内容...",
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none focus:outline-none min-h-[400px] px-4 py-3",
      },
    },
  });

  // 设置链接
  const setLink = useCallback(() => {
    if (!editor) return;

    const url = window.prompt("输入链接地址:");
    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  // 插入图片
  const insertImage = useCallback(() => {
    if (!editor) return;

    const url = window.prompt("输入图片地址:");
    if (url === null) return;

    if (url) {
      // Note: setImage requires Image extension to be configured
      // For now, insert as an image tag in HTML
      editor.chain().focus().insertContent(`<img src="${url}" alt="">`).run();
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="min-h-[400px] rounded-lg border bg-muted/20 animate-pulse" />
    );
  }

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-8 w-8 p-0",
        isActive && "bg-accent text-accent-foreground",
      )}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-1 border-b p-2">
        {/* 撤销/重做 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="撤销"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="重做"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <SeparatorComponent orientation="vertical" className="mx-1 h-6" />

        {/* 标题 */}
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          isActive={editor.isActive("heading", { level: 1 })}
          title="一级标题"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive("heading", { level: 2 })}
          title="二级标题"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editor.isActive("heading", { level: 3 })}
          title="三级标题"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <SeparatorComponent orientation="vertical" className="mx-1 h-6" />

        {/* 文本格式 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="粗体 (Cmd+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="斜体 (Cmd+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="下划线"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="删除线"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          title="行内代码"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <SeparatorComponent orientation="vertical" className="mx-1 h-6" />

        {/* 列表 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="无序列表"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="有序列表"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <SeparatorComponent orientation="vertical" className="mx-1 h-6" />

        {/* 引用和分割线 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="引用"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="分割线"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <SeparatorComponent orientation="vertical" className="mx-1 h-6" />

        {/* 链接和图片 */}
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive("link")}
          title="插入链接"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={insertImage} title="插入图片">
          {/* Placeholder icon for image insertion */}
          <span className="h-4 w-4 flex items-center justify-center text-xs font-bold">
            IMG
          </span>
        </ToolbarButton>
      </div>

      {/* 编辑器内容区 */}
      <EditorContent editor={editor} />
    </div>
  );
}
