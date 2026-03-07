import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";
import { Node } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCallback, useEffect } from "react";

// 变量占位符常量
const DOUBLE_OPEN_BRACE = "{{";
const DOUBLE_CLOSE_BRACE = "}}";

// 变量占位符节点扩展
export const VariableExtension = Node.create({
  name: "variable",

  group: "inline",

  inline: true,

  atom: true,

  addAttributes() {
    return {
      name: {
        default: null,
      },
      label: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-type='variable']",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      {
        ...HTMLAttributes,
        "data-type": "variable",
        class:
          "variable-tag inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-sm font-mono select-all",
      },
      [
        `${DOUBLE_OPEN_BRACE}`,
        HTMLAttributes.name || "",
        `${DOUBLE_CLOSE_BRACE}`,
      ].join(""),
    ];
  },
});

// 预定义的合同变量
export const CONTRACT_VARIABLES = [
  { name: "customerName", label: "客户名称", category: "basic" },
  { name: "customerShortName", label: "客户简称", category: "basic" },
  { name: "contractNo", label: "合同编号", category: "contract" },
  { name: "contractName", label: "合同名称", category: "contract" },
  { name: "contractAmount", label: "合同金额", category: "contract" },
  { name: "signDate", label: "签约日期", category: "contract" },
  { name: "startDate", label: "服务开始日期", category: "contract" },
  { name: "endDate", label: "服务结束日期", category: "contract" },
  { name: "productName", label: "产品名称", category: "product" },
  { name: "productCode", label: "产品编码", category: "product" },
  { name: "productPrice", label: "产品价格", category: "product" },
  { name: "productQuantity", label: "产品数量", category: "product" },
  { name: "companyName", label: "我方公司名称", category: "company" },
  { name: "companyAddress", label: "我方地址", category: "company" },
  { name: "companyPhone", label: "我方电话", category: "company" },
  { name: "userName", label: "操作员姓名", category: "user" },
];

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readonly?: boolean;
}

// 工具栏按钮组件
function ToolbarButton({
  onClick,
  isActive,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant={isActive ? "secondary" : "ghost"}
      size="sm"
      className="h-8 w-8 p-0"
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "请输入合同内容...",
  readonly = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline cursor-pointer",
        },
      }),
      VariableExtension,
    ],
    content,
    editable: !readonly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // 插入变量
  const insertVariable = useCallback(
    (variableName: string) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({
          type: "variable",
          attrs: {
            name: variableName,
          },
        })
        .run();
    },
    [editor],
  );

  // 设置链接
  const setLink = useCallback(
    (url: string) => {
      if (!editor) return;
      editor.chain().focus().setLink({ href: url }).run();
    },
    [editor],
  );

  if (!editor) {
    return null;
  }

  const variableGroups = CONTRACT_VARIABLES.reduce(
    (acc, variable) => {
      if (!acc[variable.category]) {
        acc[variable.category] = [];
      }
      acc[variable.category].push(variable);
      return acc;
    },
    {} as Record<string, typeof CONTRACT_VARIABLES>,
  );

  return (
    <div className="border rounded-md overflow-hidden">
      {!readonly && (
        <div className="border-b bg-muted/50 p-2 flex flex-wrap items-center gap-1">
          {/* 历史记录 */}
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

          <Separator orientation="vertical" className="h-6 mx-1" />

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

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* 文本格式 */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="粗体"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="斜体"
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
            title="代码"
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* 对齐 */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            isActive={editor.isActive({ textAlign: "left" })}
            title="左对齐"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            isActive={editor.isActive({ textAlign: "center" })}
            title="居中对齐"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            isActive={editor.isActive({ textAlign: "right" })}
            title="右对齐"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-6 mx-1" />

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

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* 链接 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive("link") ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                title="插入链接"
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <div className="space-y-2">
                <input
                  type="url"
                  placeholder="https://example.com"
                  className="w-full px-2 py-1 text-sm border rounded"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setLink(e.currentTarget.value);
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const input = document.querySelector(
                        "input[type='url']",
                      ) as HTMLInputElement;
                      setLink(input.value);
                    }}
                  >
                    确定
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => editor.chain().focus().unsetLink().run()}
                  >
                    <Unlink className="h-4 w-4 mr-1" />
                    移除
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* 变量选择器 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8">
                <span className="text-blue-600">{DOUBLE_OPEN_BRACE}</span>
                <span className="mx-1">插入变量</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 max-h-[400px] overflow-y-auto">
              <div className="space-y-3">
                {Object.entries({
                  basic: "基本信息",
                  contract: "合同信息",
                  product: "产品信息",
                  company: "我方信息",
                  user: "用户信息",
                }).map(([category, label]) => (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {label}
                    </h4>
                    <div className="space-y-1">
                      {variableGroups[category]?.map((variable) => (
                        <button
                          key={variable.name}
                          type="button"
                          onClick={() => insertVariable(variable.name)}
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded flex items-center justify-between group"
                        >
                          <span>{variable.label}</span>
                          <code className="text-xs text-muted-foreground group-hover:text-blue-600">
                            {DOUBLE_OPEN_BRACE}
                            {variable.name}
                            {DOUBLE_CLOSE_BRACE}
                          </code>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <EditorContent editor={editor} />

      <style>{`
        .ProseMirror {
          min-height: 400px;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .variable-wrapper {
          display: inline-block;
          vertical-align: middle;
        }
        .variable-tag {
          white-space: nowrap;
        }
        .ProseMirror-selectednode {
          outline: 2px solid hsl(var(--primary));
        }
      `}</style>
    </div>
  );
}
