import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionSheet, NavBar, List, Tabs, Tag, FloatingBubble, Popup, Input, Button, Toast, Dialog } from 'antd-mobile'
import { AddOutline, FolderOutline, FileOutline, UploadOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createCloudFile, createCloudFolder, deleteCloudFile, listCloudFiles, renameCloudFile } from '../../services/oa'
import { uploadFile } from '../../services/upload'

const SCOPE_TABS = [
  { key: 'personal', label: '个人' },
  { key: 'dept', label: '部门' },
  { key: 'public', label: '公共' },
]

function formatSize(bytes: number) {
  if (!bytes) return '-'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function CloudPage() {
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const [scope, setScope] = useState('personal')
  const [parentId, setParentId] = useState(0)
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [renaming, setRenaming] = useState<any>(null)
  const [renameVal, setRenameVal] = useState('')

  const loadFiles = useCallback(async (pid: number, sc: string) => {
    setLoading(true)
    try {
      const res = await listCloudFiles(pid, sc)
      setFiles(res.list || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadFiles(parentId, scope) }, [parentId, scope, loadFiles])

  const switchScope = (s: string) => {
    setScope(s)
    setParentId(0)
    setFiles([])
  }

  const handleNewFolder = async () => {
    if (!folderName) { Toast.show('请输入名称'); return }
    await createCloudFolder({ parent_id: parentId, name: folderName, scope })
    Toast.show({ icon: 'success', content: '已创建' })
    setShowNewFolder(false)
    setFolderName('')
    loadFiles(parentId, scope)
  }

  const onUpload = () => fileInput.current?.click()
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    Toast.show({ icon: 'loading', content: '上传中', duration: 0 })
    try {
      const res = await uploadFile(f)
      await createCloudFile({ parent_id: parentId, name: f.name, url: res.url, object_key: res.object_key, size: f.size, scope })
      Toast.clear()
      Toast.show({ icon: 'success', content: '已上传' })
      loadFiles(parentId, scope)
    } catch {
      Toast.clear()
    }
    e.target.value = ''
  }

  const onMore = (f: any) => {
    const actions = [
      ...(f.is_dir === 0 && f.url ? [{ text: '查看', key: 'view' }] : []),
      { text: '重命名', key: 'rename' },
      { text: '删除', key: 'delete', danger: true },
    ]
    ActionSheet.show({
      actions,
      cancelText: '取消',
      onAction: (item) => {
        if (item.key === 'view' && f.url) window.open(f.url, '_blank')
        else if (item.key === 'rename') { setRenaming(f); setRenameVal(f.name) }
        else if (item.key === 'delete') onDeleteFile(f)
      },
    })
  }

  const onDeleteFile = async (f: any) => {
    const ok = await Dialog.confirm({ content: `确定删除「${f.name}」?` })
    if (!ok) return
    try {
      await deleteCloudFile(f.id)
      Toast.show({ icon: 'success', content: '已删除' })
      loadFiles(parentId, scope)
    } catch {
    }
  }

  const doRename = async () => {
    if (!renameVal.trim()) { Toast.show('请输入名称'); return }
    try {
      await renameCloudFile(renaming.id, { name: renameVal })
      Toast.show({ icon: 'success', content: '已重命名' })
      setRenaming(null)
      loadFiles(parentId, scope)
    } catch {
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <input ref={fileInput} type="file" style={{ display: 'none' }} onChange={onFileChange} />
      <NavBar
        onBack={() => navigate(-1)}
        right={<UploadOutline fontSize={20} onClick={onUpload} />}
      >企业网盘</NavBar>
      <Tabs activeKey={scope} onChange={switchScope}>
        {SCOPE_TABS.map((t) => <Tabs.Tab key={t.key} title={t.label} />)}
      </Tabs>

      <List>
        {files.map((f) => (
          <List.Item
            key={f.id}
            onClick={() => f.is_dir === 1 ? (setParentId(f.id), loadFiles(f.id, scope)) : (f.url ? window.open(f.url, '_blank') : null)}
            prefix={f.is_dir === 1 ? <FolderOutline style={{ color: '#faad14', fontSize: 20 }} /> : <FileOutline style={{ color: '#8c8c8c', fontSize: 20 }} />}
            description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{f.is_dir === 1 ? '文件夹' : formatSize(f.size)}</span>}
            extra={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {f.is_dir === 0 && f.url && <Tag color="primary" fill="outline">查看</Tag>}
                <a style={{ color: 'var(--text-tertiary)', fontSize: 16 }} onClick={(e) => { e.stopPropagation(); onMore(f) }}>⋮</a>
              </span>
            }
          >
            {f.name}
          </List.Item>
        ))}
        {files.length === 0 && !loading && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无文件</span></List.Item>}
      </List>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNewFolder(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <Popup
        visible={showNewFolder}
        onMaskClick={() => setShowNewFolder(false)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 20 }}
        destroyOnClose
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>新建文件夹</div>
        <Input placeholder="文件夹名称" value={folderName} onChange={setFolderName} />
        <Button block color="primary" size="large" style={{ marginTop: 16 }} onClick={handleNewFolder}>确定</Button>
      </Popup>

      <Popup
        visible={!!renaming}
        onMaskClick={() => setRenaming(null)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 20 }}
        destroyOnClose
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>重命名</div>
        <Input placeholder="新名称" value={renameVal} onChange={setRenameVal} />
        <Button block color="primary" size="large" style={{ marginTop: 16 }} onClick={doRename}>确定</Button>
      </Popup>
    </div>
  )
}
