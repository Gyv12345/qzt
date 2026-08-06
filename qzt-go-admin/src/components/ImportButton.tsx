/**
 * ImportButton — 通用导入按钮组件。
 *
 * 功能:下载模板 + 上传 Excel + 显示导入结果(成功/失败/错误明细)。
 *
 * 用法:
 * <ImportButton bizType="customer" onImported={() => actionRef.current?.reload()} />
 */

import { useState } from 'react'
import { App, Button, Dropdown, Modal, Table, Upload, type UploadProps } from 'antd'
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import request from '../utils/request'

interface ImportButtonProps {
  bizType: string // customer / lead / ...
  label?: string
  onImported?: () => void
}

interface ImportResult {
  total: number
  success: number
  failed: number
  errors: { row: number; name: string; message: string }[]
}

export default function ImportButton({ bizType, label = '导入', onImported }: ImportButtonProps) {
  const { message } = App.useApp()
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleDownloadTemplate = () => {
    // 直接下载模板文件
    const a = document.createElement('a')
    a.href = `/prod-api/crm/import/template?biz_type=${bizType}`
    a.download = '导入模板.xlsx'
    // 加 token
    fetch(`/prod-api/crm/import/template?biz_type=${bizType}`, {
      headers: {
        Authorization: `Bearer ${JSON.parse(localStorage.getItem('qzt-go-admin:tokens') || '{}').accessToken || ''}`,
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        a.href = url
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch(() => message.error('下载模板失败'))
  }

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls',
    showUploadList: false,
    beforeUpload: (file) => {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      request
        .post<unknown, ImportResult>(`/crm/import?biz_type=${bizType}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((res) => {
          setResult(res)
          setModalOpen(true)
          if (res.success > 0) {
            message.success(`导入完成: 成功 ${res.success} 条${res.failed > 0 ? `, 失败 ${res.failed} 条` : ''}`)
            onImported?.()
          } else {
            message.warning(`导入失败 ${res.failed} 条`)
          }
        })
        .catch(() => message.error('导入失败,请检查文件格式'))
        .finally(() => setUploading(false))

      return false // 阻止 antd 自动上传
    },
  }

  return (
    <>
      <Dropdown
        key="import"
        menu={{
          items: [
            { key: 'template', label: '下载模板', icon: <DownloadOutlined /> },
            { key: 'upload', label: '上传导入', icon: <UploadOutlined /> },
          ],
          onClick: ({ key }) => {
            if (key === 'template') handleDownloadTemplate()
          },
        }}
      >
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />} loading={uploading}>
            {label}
          </Button>
        </Upload>
      </Dropdown>

      <Modal
        title="导入结果"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => setModalOpen(false)}
        width={640}
      >
        {result && (
          <>
            <div style={{ marginBottom: 16, fontSize: 14 }}>
              <span style={{ marginRight: 24 }}>总计: {result.total} 条</span>
              <span style={{ color: '#52c41a', marginRight: 24 }}>成功: {result.success} 条</span>
              {result.failed > 0 && <span style={{ color: '#ff4d4f' }}>失败: {result.failed} 条</span>}
            </div>
            {result.errors.length > 0 && (
              <Table
                size="small"
                pagination={{ pageSize: 10 }}
                rowKey={(r) => `${r.row}-${r.name}`}
                dataSource={result.errors}
                columns={[
                  { title: '行号', dataIndex: 'row', width: 70 },
                  { title: '名称', dataIndex: 'name', width: 200, ellipsis: true },
                  { title: '错误原因', dataIndex: 'message' },
                ]}
              />
            )}
          </>
        )}
      </Modal>
    </>
  )
}
