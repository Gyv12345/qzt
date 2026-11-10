import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Empty, Input, Space, Spin, Tag, Tooltip, Typography } from 'antd'
import { CopyOutlined, DeleteOutlined, FileOutlined, ReloadOutlined } from '@ant-design/icons'
import { deleteMedia, listMedia, type MediaItem } from '../../../services/cms'
import Auth from '../../../components/Auth'

/**
 * P22 媒体库：浏览/检索公共桶对象、复制直链、删除。
 * 上传走各业务处的上传组件(ImageUpload 等),媒体库只做管理与复用。
 */
export default function MediaPage() {
  const { message, modal } = App.useApp()
  const [keyword, setKeyword] = useState('')
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (kw: string) => {
    setLoading(true)
    try {
      const list = await listMedia({ keyword: kw || undefined })
      setItems(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load('')
  }, [load])

  const handleCopy = async (item: MediaItem) => {
    await navigator.clipboard.writeText(item.url)
    message.success('URL 已复制')
  }

  const handleDelete = (item: MediaItem) => {
    modal.confirm({
      title: `删除 ${item.key}?`,
      content: '删除后引用该地址的页面将无法显示图片,确认删除?',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const res = await deleteMedia([item.key])
        if (res.failed.length > 0) {
          message.error(`删除失败: ${res.failed.join(', ')}`)
        } else {
          message.success('已删除')
        }
        load(keyword)
      },
    })
  }

  return (
    <Card
      title="媒体库"
      extra={
        <Space>
          <Input.Search
            allowClear
            placeholder="按文件名搜索"
            style={{ width: 240 }}
            onSearch={(v) => {
              setKeyword(v)
              load(v)
            }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => load(keyword)}>
            刷新
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {items.length === 0 ? (
          <Empty description="暂无媒体文件(上传入口在各业务的图片上传处)" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {items.map((item) => (
              <Card
                key={item.key}
                size="small"
                hoverable
                cover={
                  item.is_image ? (
                    <img
                      alt={item.key}
                      src={item.url}
                      style={{ height: 120, objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileOutlined style={{ fontSize: 40, color: '#999' }} />
                    </div>
                  )
                }
                actions={[
                  <Tooltip title="复制 URL" key="copy">
                    <CopyOutlined onClick={() => handleCopy(item)} />
                  </Tooltip>,
                  <Auth perm="cms:media:delete" key="del">
                    <Tooltip title="删除">
                      <DeleteOutlined onClick={() => handleDelete(item)} />
                    </Tooltip>
                  </Auth>,
                ]}
              >
                <Card.Meta
                  title={
                    <Typography.Text ellipsis style={{ fontSize: 12 }}>
                      {item.key.split('/').pop()}
                    </Typography.Text>
                  }
                  description={
                    <Space size={4} direction="vertical">
                      <span style={{ fontSize: 12 }}>{(item.size / 1024).toFixed(1)} KB</span>
                      <span style={{ fontSize: 12 }}>{item.last_modified}</span>
                      <Tag style={{ fontSize: 11 }}>{item.key.split('/')[0]}</Tag>
                    </Space>
                  }
                />
              </Card>
            ))}
          </div>
        )}
      </Spin>
    </Card>
  )
}