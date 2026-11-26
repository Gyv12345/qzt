import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { App, Button, Card, Empty, Form, Input, Modal, Popconfirm, Space, Spin, Switch, Tag, Tooltip } from 'antd'
import { ArrowLeftOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Auth from '../../../components/Auth'
import MarkdownEditor from '../../../components/MarkdownEditor'
import {
  generateArticle,
  getArticle,
  pushArticleDraft,
  updateArticle,
  type MpArticlePayload,
} from '../../../services/mp'
import type { MpArticle } from '../../../types/mp'

/** 可编辑字段(本地草稿,点保存才落库) */
interface EditorDraft {
  title: string
  digest: string
  author: string
  cover_url: string
  theme: string
  points: string
  content_md: string
}

interface GenerateFormValues {
  theme?: string
  points?: string
  use_kb: boolean
}

/** 微信限制:标题 64 字、摘要 120 字节 */
const TITLE_MAX = 64
const DIGEST_BYTES_MAX = 120

const STATUS_META: Record<MpArticle['status'], { color: string; text: string }> = {
  draft: { color: 'default', text: '草稿' },
  pushed: { color: 'green', text: '已推草稿箱' },
  failed: { color: 'red', text: '推送失败' },
}

/** AI 等待三点动画(仿 AiFloatChat 的 ai-float-dots,本地独立命名避免耦合) */
const dotsStyle = `
@keyframes mp-ai-dot-jump {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}
.mp-ai-dots { display: inline-flex; align-items: center; gap: 4px; height: 18px; }
.mp-ai-dots i { width: 6px; height: 6px; border-radius: 50%; background: #1677ff; animation: mp-ai-dot-jump 1.2s infinite ease-in-out; }
.mp-ai-dots i:nth-child(2) { animation-delay: 0.2s; }
.mp-ai-dots i:nth-child(3) { animation-delay: 0.4s; }
`

function AiDots() {
  return (
    <span className="mp-ai-dots">
      <style>{dotsStyle}</style>
      <i />
      <i />
      <i />
    </span>
  )
}

/** 公众号正文预览样式:贴近微信图文渲染(17px/1.75 行高/段间距 1em/图片圆角) */
const previewStyle = `
.mp-preview-body p { margin: 0 0 1em; }
.mp-preview-body h1, .mp-preview-body h2, .mp-preview-body h3 { margin: 1.2em 0 0.6em; font-weight: 600; }
.mp-preview-body img { max-width: 100%; border-radius: 6px; }
.mp-preview-body blockquote { margin: 0 0 1em; padding: 4px 12px; border-left: 3px solid #d9d9d9; color: #666; }
.mp-preview-body pre { background: #f6f6f6; padding: 12px; border-radius: 6px; overflow: auto; font-size: 14px; }
.mp-preview-body code { font-size: 14px; }
.mp-preview-body table { border-collapse: collapse; width: 100%; }
.mp-preview-body th, .mp-preview-body td { border: 1px solid #e5e5e5; padding: 6px 8px; }
.mp-preview-body a { color: #576b95; }
.mp-preview-body ul, .mp-preview-body ol { margin: 0 0 1em; padding-left: 24px; }
`

const EMPTY_DRAFT: EditorDraft = {
  title: '',
  digest: '',
  author: '',
  cover_url: '',
  theme: '',
  points: '',
  content_md: '',
}

export default function MpArticleEditorPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const articleId = searchParams.get('id') ? Number(searchParams.get('id')) : null

  const [loading, setLoading] = useState(false)
  const [article, setArticle] = useState<MpArticle | null>(null)
  const [draft, setDraft] = useState<EditorDraft>(EMPTY_DRAFT)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pushing, setPushing] = useState(false)
  // AI 生成弹窗
  const [genOpen, setGenOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genForm] = Form.useForm<GenerateFormValues>()

  const titleOver = Array.from(draft.title).length > TITLE_MAX
  const digestBytes = new TextEncoder().encode(draft.digest).length
  const digestOver = digestBytes > DIGEST_BYTES_MAX

  /** 本地编辑:只改 state,点「保存」才 updateArticle(防误触) */
  const edit = (patch: Partial<EditorDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
    setDirty(true)
  }

  // 进入页面加载文章
  useEffect(() => {
    if (!articleId) return
    setLoading(true)
    getArticle(articleId)
      .then((a) => {
        setArticle(a)
        setDraft({
          title: a.title,
          digest: a.digest,
          author: a.author,
          cover_url: a.cover_url,
          theme: a.theme,
          points: a.points,
          content_md: a.content_md,
        })
        setDirty(false)
      })
      .catch((err) => message.error(err instanceof Error ? err.message : '加载文章失败'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId])

  const buildPayload = (): MpArticlePayload => ({
    account_id: article!.account_id,
    title: draft.title,
    digest: draft.digest,
    author: draft.author,
    cover_url: draft.cover_url,
    theme: draft.theme,
    points: draft.points,
    content_md: draft.content_md,
  })

  /** 保存;quiet=true 时不弹「已保存」(推送前自动保存场景用) */
  const doSave = async (opts?: { quiet?: boolean }): Promise<boolean> => {
    if (!article) return false
    if (!draft.title.trim()) {
      message.warning('请输入标题')
      return false
    }
    setSaving(true)
    try {
      await updateArticle(article.id, buildPayload())
      setDirty(false)
      if (!opts?.quiet) message.success('已保存')
      return true
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败')
      return false
    } finally {
      setSaving(false)
    }
  }

  /** 推送草稿箱:本地有未保存修改先自动保存,再推送 */
  const handlePush = async () => {
    if (!article) return
    setPushing(true)
    try {
      if (dirty) {
        const saved = await doSave({ quiet: true })
        if (!saved) return
      }
      const res = await pushArticleDraft(article.id)
      message.success(res.message || '已推送到微信草稿箱')
      // 重新拉取刷新状态(wx_media_id/pushed_at/status)
      const fresh = await getArticle(article.id)
      setArticle(fresh)
      setDraft({
        title: fresh.title,
        digest: fresh.digest,
        author: fresh.author,
        cover_url: fresh.cover_url,
        theme: fresh.theme,
        points: fresh.points,
        content_md: fresh.content_md,
      })
      setDirty(false)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '推送失败')
    } finally {
      setPushing(false)
    }
  }

  const openGenerate = () => {
    genForm.setFieldsValue({ theme: draft.theme, points: draft.points, use_kb: true })
    setGenOpen(true)
  }

  const handleGenerate = async () => {
    if (!article) return
    const values = await genForm.validateFields()
    setGenerating(true)
    try {
      const res = await generateArticle(article.id, {
        theme: values.theme,
        points: values.points,
        use_kb: values.use_kb,
      })
      // 后端已落库,把生成结果写入本地表单状态(与线上保持一致,不标脏)
      setDraft((prev) => ({
        ...prev,
        title: res.title,
        digest: res.digest,
        content_md: res.content_md,
        theme: res.theme || prev.theme,
        points: res.points || prev.points,
      }))
      setArticle((prev) => (prev ? { ...prev, status: res.status } : prev))
      setDirty(false)
      message.success('生成完成,请人工审阅修改')
      setGenOpen(false)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'AI 生成失败,请稍后重试')
    } finally {
      setGenerating(false)
    }
  }

  if (!articleId) {
    return <Empty description="缺少文章 ID,请从文章列表进入" style={{ marginTop: 80 }} />
  }

  const statusMeta = article ? STATUS_META[article.status] ?? STATUS_META.draft : null

  return (
    <Spin spinning={loading}>
      <Card
        title={
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <Input
              value={draft.title}
              onChange={(e) => edit({ title: e.target.value })}
              placeholder="文章标题(64 字内)"
              variant="borderless"
              style={{ fontSize: 18, fontWeight: 600, padding: 0 }}
              maxLength={200}
            />
            <span style={{ fontSize: 12, color: titleOver ? '#ff4d4f' : 'var(--ant-color-text-tertiary)' }}>
              {Array.from(draft.title).length}/{TITLE_MAX}
              {titleOver ? ' ,超出微信标题限制' : ''}
            </span>
          </Space>
        }
        extra={
          <Space wrap>
            {article && statusMeta && (
              <>
                <Tag color={statusMeta.color}>{statusMeta.text}</Tag>
                {article.status === 'failed' && article.error_msg && (
                  <Tooltip title={article.error_msg}>
                    <span style={{ color: '#ff4d4f', fontSize: 12 }}>失败原因</span>
                  </Tooltip>
                )}
              </>
            )}
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
              返回
            </Button>
            <Button type="primary" loading={saving} onClick={() => doSave()}>
              保存
            </Button>
            <Auth perm="mp:article:generate">
              <Button icon={<RobotOutlined />} loading={generating} onClick={openGenerate}>
                AI 生成
              </Button>
            </Auth>
            <Auth perm="mp:article:push">
              <Popconfirm
                title="确认推送到草稿箱?"
                description="推送后将在微信公众号后台草稿箱出现,发布仍在 mp.weixin.qq.com 人工点击"
                okText="推送"
                cancelText="取消"
                onConfirm={handlePush}
              >
                <Button icon={<SendOutlined />} loading={pushing} disabled={generating}>
                  推送草稿箱
                </Button>
              </Popconfirm>
            </Auth>
          </Space>
        }
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {/* 左栏:编辑区 */}
          <div style={{ flex: '1 1 520px', minWidth: 0 }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div>
                <div style={{ marginBottom: 4 }}>
                  摘要
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 12,
                      color: digestOver ? '#ff4d4f' : 'var(--ant-color-text-tertiary)',
                    }}
                  >
                    {digestBytes}/{DIGEST_BYTES_MAX} 字节
                    {digestOver ? ' ,超出微信摘要限制' : ''}
                  </span>
                </div>
                <Input.TextArea
                  rows={2}
                  value={draft.digest}
                  onChange={(e) => edit({ digest: e.target.value })}
                  placeholder="文章摘要,留空则由首段生成"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ marginBottom: 4 }}>封面图 URL</div>
                  <Input
                    value={draft.cover_url}
                    onChange={(e) => edit({ cover_url: e.target.value })}
                    placeholder="留空自动取正文首图"
                  />
                </div>
                <div>
                  <div style={{ marginBottom: 4 }}>作者</div>
                  <Input
                    value={draft.author}
                    onChange={(e) => edit({ author: e.target.value })}
                    placeholder="作者名,留空则不显示"
                  />
                </div>
                <div>
                  <div style={{ marginBottom: 4 }}>主题</div>
                  <Input
                    value={draft.theme}
                    onChange={(e) => edit({ theme: e.target.value })}
                    placeholder="AI 生成要围绕的主题"
                  />
                </div>
                <div>
                  <div style={{ marginBottom: 4 }}>要点</div>
                  <Input.TextArea
                    rows={1}
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    value={draft.points}
                    onChange={(e) => edit({ points: e.target.value })}
                    placeholder="每行一个要点"
                  />
                </div>
              </div>
              <div>
                <div style={{ marginBottom: 4 }}>正文(Markdown)</div>
                <MarkdownEditor
                  height={520}
                  value={draft.content_md}
                  onChange={(v) => edit({ content_md: v })}
                  placeholder="支持 Markdown 语法(标题/图片/表格/代码块等),可直接粘贴图片"
                />
              </div>
            </Space>
          </div>
          {/* 右栏:手机壳预览 */}
          <div style={{ flex: '1 1 380px', minWidth: 300, maxWidth: 460 }}>
            <div
              style={{
                position: 'sticky',
                top: 16,
                maxWidth: 420,
                margin: '0 auto',
                border: '1px solid #e5e5e5',
                borderRadius: 12,
                background: '#fff',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: 680,
                boxShadow: '0 4px 16px rgba(0,0,0,.06)',
              }}
            >
              {/* 模拟公众号文章头 */}
              <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #f0f0f0' }}>
                <Space size={8}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 4,
                      background: '#07c160',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    行
                  </div>
                  <span style={{ fontSize: 13, color: '#576b95' }}>
                    {article?.account_name || '行简'}
                  </span>
                </Space>
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 20,
                    fontWeight: 600,
                    lineHeight: 1.4,
                    color: '#1a1a1a',
                    wordBreak: 'break-word',
                  }}
                >
                  {draft.title || '文章标题'}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: '#999' }}>
                  {[draft.author, (article?.updated_at ?? '').slice(0, 10)]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              {/* 封面图 */}
              {draft.cover_url && (
                <img
                  src={draft.cover_url}
                  alt="封面"
                  style={{ width: '100%', display: 'block', maxHeight: 180, objectFit: 'cover' }}
                />
              )}
              {/* 正文预览 */}
              <div
                className="mp-preview-body"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px 16px 24px',
                  fontSize: 17,
                  lineHeight: 1.75,
                  color: '#333',
                }}
              >
                <style>{previewStyle}</style>
                {draft.content_md ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft.content_md}</ReactMarkdown>
                ) : (
                  <div style={{ color: '#bbb', textAlign: 'center', marginTop: 120, fontSize: 14 }}>
                    正文预览区
                  </div>
                )}
              </div>
              {/* 底部固定提示条 */}
              <div
                style={{
                  borderTop: '1px solid #f0f0f0',
                  background: '#fafafa',
                  padding: '8px 16px',
                  fontSize: 12,
                  color: 'var(--ant-color-text-tertiary)',
                  textAlign: 'center',
                }}
              >
                以上为 Markdown 预览,推送后以微信实际渲染为准
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* AI 生成弹窗 */}
      <Modal
        title="AI 生成文章"
        open={genOpen}
        onCancel={() => {
          if (!generating) setGenOpen(false)
        }}
        closable={!generating}
        maskClosable={false}
        keyboard={!generating}
        footer={
          generating
            ? null
            : [
                <Button key="cancel" onClick={() => setGenOpen(false)}>
                  取消
                </Button>,
                <Button key="ok" type="primary" onClick={handleGenerate}>
                  开始生成
                </Button>,
              ]
        }
        width={520}
      >
        <div style={{ position: 'relative' }}>
          <Form form={genForm} layout="vertical" disabled={generating}>
            <Form.Item name="theme" label="主题">
              <Input placeholder="AI 生成要围绕的主题" />
            </Form.Item>
            <Form.Item name="points" label="要点">
              <Input.TextArea rows={4} placeholder="每行一个要点,留空则仅按主题生成" />
            </Form.Item>
            <Form.Item name="use_kb" label="结合知识库(kb)检索事实" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <div style={{ color: 'var(--ant-color-text-tertiary)', fontSize: 12 }}>
              生成将覆盖现有标题/摘要/正文,生成后请人工审阅修改。
            </div>
          </Form>
          {generating && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255,255,255,.85)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <AiDots />
              <span style={{ color: 'var(--ant-color-text-secondary)' }}>AI 正在写稿,约 30~90 秒…</span>
            </div>
          )}
        </div>
      </Modal>
    </Spin>
  )
}
