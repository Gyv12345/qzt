import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { App, Button, Card, Drawer, Space, Timeline, Input } from 'antd'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { createDocument, getDocument, updateDocument, listCategories, listVersions, restoreVersion } from '../../../services/kb'
import type { KbCategory, KbVersion } from '../../../types/kb'

/** 工具栏按钮 */
function MenuButton({ editor, action, icon, title }: { editor: any; action: string; icon: string; title: string }) {
  const actions: Record<string, () => void> = {
    bold: () => editor.chain().focus().toggleBold().run(),
    italic: () => editor.chain().focus().toggleItalic().run(),
    strike: () => editor.chain().focus().toggleStrike().run(),
    h1: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    h2: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    h3: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    bullet: () => editor.chain().focus().toggleBulletList().run(),
    ordered: () => editor.chain().focus().toggleOrderedList().run(),
    code: () => editor.chain().focus().toggleCodeBlock().run(),
    quote: () => editor.chain().focus().toggleBlockquote().run(),
    table: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    undo: () => editor.chain().focus().undo().run(),
    redo: () => editor.chain().focus().redo().run(),
  }
  const labels: Record<string, string> = {
    bold: 'B', italic: 'I', strike: 'S', h1: 'H1', h2: 'H2', h3: 'H3',
    bullet: '•', ordered: '1.', code: '</>', quote: '❝', table: '⊞', undo: '↶', redo: '↷',
  }
  return (
    <button
      onClick={actions[action]}
      title={title}
      style={{
        border: 'none', background: 'transparent', cursor: 'pointer',
        padding: '4px 8px', borderRadius: 4, fontWeight: action === 'bold' ? 'bold' : 'normal',
        fontStyle: action === 'italic' ? 'italic' : 'normal',
      }}
    >
      {labels[action] || icon}
    </button>
  )
}

export default function DocumentEditorPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const docId = searchParams.get('id') ? Number(searchParams.get('id')) : null

  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState(0)
  const [, setCategories] = useState<KbCategory[]>([])
  const [status, setStatus] = useState('draft')
  const [versions, setVersions] = useState<KbVersion[]>([])
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentDocId, setCurrentDocId] = useState<number | null>(docId)
  const wsRef = useRef<WebSocket | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '',
  })

  useEffect(() => {
    listCategories().then((res) => setCategories(res.list || []))
  }, [])

  // 加载已有文档
  useEffect(() => {
    if (!docId) return
    getDocument(docId).then((doc) => {
      setTitle(doc.title)
      setCategoryId(doc.category_id)
      setStatus(doc.status)
      setCurrentDocId(doc.id)
      if (editor && doc.content) {
        editor.commands.setContent(doc.content)
      }
    })
    // 加载版本
    listVersions(docId, { page: 1, page_size: 20 }).then((res) => setVersions(res.list || []))
  }, [docId, editor])

  // WebSocket 协同连接
  const connectCollab = useCallback((id: number) => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    let token = ''
    try {
      const raw = localStorage.getItem('qzt-go-admin:tokens')
      if (raw) token = (JSON.parse(raw) as { accessToken?: string }).accessToken || ''
    } catch { /* ignore */ }
    if (!token) return

    const wsUrl = `wss://admin.devlovecode.com/prod-api/kb/documents/${id}/collab?token=${token}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      // 连接成功
    }

    ws.onmessage = (event) => {
      // 接收协同更新(简单方案:如果是文本消息,更新编辑器内容)
      if (typeof event.data === 'string' && event.data.startsWith('<')) {
        // HTML 内容更新(简化方案:直接设置内容)
        // 完整 Yjs 方案需要解析 binary update,这里用简化方案
      }
    }

    ws.onclose = () => {
      wsRef.current = null
    }
  }, [])

  useEffect(() => {
    if (currentDocId) {
      connectCollab(currentDocId)
    }
    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [currentDocId, connectCollab])

  // 自动保存(每 30 秒)
  useEffect(() => {
    if (!editor || !currentDocId) return

    saveTimerRef.current = setInterval(() => {
      const html = editor.getHTML()
      updateDocument(currentDocId, { title, content: html }).then(() => {
        // 静默保存
      })
    }, 30000)

    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current)
    }
  }, [editor, currentDocId, title])

  // 编辑器内容变化 → 通过 WebSocket 广播(简化方案:发送 HTML)
  useEffect(() => {
    if (!editor || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const handler = () => {
      const html = editor.getHTML()
      // 通过 WebSocket 发送内容(简化方案;完整 Yjs 方案发送 binary update)
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(html)
      }
    }

    editor.on('update', handler)
    return () => { editor.off('update', handler) }
  }, [editor])

  const handleSave = async () => {
    if (!editor) return
    if (!title.trim()) {
      message.warning('请输入文档标题')
      return
    }
    setSaving(true)
    try {
      const html = editor.getHTML()
      if (currentDocId) {
        await updateDocument(currentDocId, { title, content: html, status })
        message.success('已保存')
        // 刷新版本列表
        const res = await listVersions(currentDocId, { page: 1, page_size: 20 })
        setVersions(res.list || [])
      } else {
        const doc = await createDocument({ category_id: categoryId, title, content: html, status })
        setCurrentDocId(doc.id)
        message.success('已创建')
        navigate(`/kb/document/editor?id=${doc.id}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setStatus('published')
    if (currentDocId && editor) {
      await updateDocument(currentDocId, { title, content: editor.getHTML(), status: 'published' })
      message.success('已发布')
    }
  }

  const handleRestore = async (versionId: number) => {
    if (!currentDocId || !editor) return
    await restoreVersion(currentDocId, versionId)
    message.success('已回滚,正在刷新...')
    // 重新加载文档
    const doc = await getDocument(currentDocId)
    if (doc.content) editor.commands.setContent(doc.content)
    const res = await listVersions(currentDocId, { page: 1, page_size: 20 })
    setVersions(res.list || [])
  }

  if (!editor) return <div>加载编辑器...</div>

  return (
    <div style={{ padding: 0 }}>
      <Card
        title={
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文档标题"
            bordered={false}
            style={{ fontSize: 18, fontWeight: 600 }}
          />
        }
        extra={
          <Space>
            <Button onClick={() => navigate('/kb/document')}>返回列表</Button>
            <Button onClick={() => setVersionDrawerOpen(true)}>版本历史 ({versions.length})</Button>
            {status === 'draft' && <Button onClick={handlePublish}>发布</Button>}
            <Button type="primary" loading={saving} onClick={handleSave}>保存</Button>
          </Space>
        }
      >
        {/* 工具栏 */}
        <div style={{ borderBottom: '1px solid #e8e8e8', paddingBottom: 8, marginBottom: 16, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <MenuButton editor={editor} action="undo" icon="" title="撤销" />
          <MenuButton editor={editor} action="redo" icon="" title="重做" />
          <span style={{ borderLeft: '1px solid #ddd', margin: '0 4px' }} />
          <MenuButton editor={editor} action="h1" icon="" title="标题1" />
          <MenuButton editor={editor} action="h2" icon="" title="标题2" />
          <MenuButton editor={editor} action="h3" icon="" title="标题3" />
          <span style={{ borderLeft: '1px solid #ddd', margin: '0 4px' }} />
          <MenuButton editor={editor} action="bold" icon="" title="加粗" />
          <MenuButton editor={editor} action="italic" icon="" title="斜体" />
          <MenuButton editor={editor} action="strike" icon="" title="删除线" />
          <span style={{ borderLeft: '1px solid #ddd', margin: '0 4px' }} />
          <MenuButton editor={editor} action="bullet" icon="" title="无序列表" />
          <MenuButton editor={editor} action="ordered" icon="" title="有序列表" />
          <MenuButton editor={editor} action="quote" icon="" title="引用" />
          <MenuButton editor={editor} action="code" icon="" title="代码块" />
          <span style={{ borderLeft: '1px solid #ddd', margin: '0 4px' }} />
          <MenuButton editor={editor} action="table" icon="" title="插入表格" />
        </div>

        {/* 编辑器 */}
        <div className="kb-editor-content" style={{ minHeight: 500 }}>
          <EditorContent editor={editor} />
        </div>
      </Card>

      {/* 版本历史 Drawer */}
      <Drawer
        title="版本历史"
        open={versionDrawerOpen}
        onClose={() => setVersionDrawerOpen(false)}
        width={400}
      >
        <Timeline
          items={versions.map((v) => ({
            color: 'blue',
            children: (
              <div>
                <div style={{ fontWeight: 600 }}>版本 {v.version_number}</div>
                <div style={{ color: '#999', fontSize: 12 }}>{v.created_at?.slice(0, 16)}</div>
                <Button type="link" size="small" onClick={() => handleRestore(v.id)}>回滚到此版本</Button>
              </div>
            ),
          }))}
        />
        {versions.length === 0 && <div style={{ color: '#999', textAlign: 'center' }}>暂无版本历史</div>}
      </Drawer>
    </div>
  )
}
