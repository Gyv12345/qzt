import { useState, useCallback } from 'react'
import { NavBar, List, Tabs, Tag, FloatingBubble, Popup, Input, Button, Toast } from 'antd-mobile'
import { AddOutline, FolderOutline, FileOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { listCloudFiles, createCloudFolder } from '../../services/oa'

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
  const [scope, setScope] = useState('personal')
  const [parentId, setParentId] = useState(0)
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [folderName, setFolderName] = useState('')

  const loadFiles = useCallback(async (pid: number, sc: string) => {
    setLoading(true)
    try {
      const res = await listCloudFiles(pid, sc)
      setFiles(res.list || [])
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on scope/parent change
  useState(() => { loadFiles(0, scope) })
  if (files.length === 0 && !loading) { loadFiles(parentId, scope) }

  const switchScope = (s: string) => {
    setScope(s)
    setParentId(0)
    setFiles([])
    loadFiles(0, s)
  }

  const handleNewFolder = async () => {
    if (!folderName) { Toast.show('请输入名称'); return }
    await createCloudFolder({ parent_id: parentId, name: folderName, scope })
    Toast.show({ icon: 'success', content: '已创建' })
    setShowNewFolder(false)
    setFolderName('')
    loadFiles(parentId, scope)
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>企业网盘</NavBar>
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
            extra={f.is_dir === 0 && f.url ? <Tag color="primary" fill="outline">查看</Tag> : null}
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
    </div>
  )
}
