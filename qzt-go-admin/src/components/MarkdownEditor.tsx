import MDEditor from '@uiw/react-md-editor'

interface MarkdownEditorProps {
  value?: string
  onChange?: (value: string) => void
  height?: number
  placeholder?: string
}

/**
 * Markdown 编辑器(带预览),输出 markdown 文本。
 * CMS 端配合 react-markdown 或 dangerouslySetInnerHTML 渲染。
 */
export default function MarkdownEditor({
  value,
  onChange,
  height = 300,
  placeholder = '支持 Markdown 语法',
}: MarkdownEditorProps) {
  return (
    <div data-color-mode="light" style={{ width: '100%' }}>
      <MDEditor
        value={value}
        height={height}
        preview="edit"
        onChange={(val) => onChange?.(val ?? '')}
        textareaProps={{ placeholder }}
      />
    </div>
  )
}
