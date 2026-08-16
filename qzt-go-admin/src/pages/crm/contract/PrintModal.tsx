import { useEffect, useRef, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button, Modal, Select, Space, Spin } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { listContractTemplates, printContractDocument } from '../../../services/crm'
import type { CrmContractTemplate } from '../../../types/crm'

interface PrintModalProps {
  /** 合同 ID(null/未挂载时不请求) */
  contractId: number
  onClose: () => void
}

/** 合同套打文档弹窗:选择模板 → 后端渲染 Markdown → 预览并调起浏览器打印 */
export default function PrintModal({ contractId, onClose }: PrintModalProps) {
  const [printTemplates, setPrintTemplates] = useState<CrmContractTemplate[]>([])
  const [printTplId, setPrintTplId] = useState<number | undefined>()
  const [printMarkdown, setPrintMarkdown] = useState('')
  const [printLoading, setPrintLoading] = useState(false)
  const printPreviewRef = useRef<HTMLDivElement>(null)

  // 打开时拉启用模板列表(每次挂载重新拉取)
  useEffect(() => {
    listContractTemplates({ page: 1, page_size: 50, enabled: 1 })
      .then((res) => setPrintTemplates(res.list ?? []))
      .catch(() => {})
  }, [])

  // 选模板后调后端渲染
  const handlePrintRender = async (templateId: number) => {
    setPrintTplId(templateId)
    setPrintLoading(true)
    try {
      const res = await printContractDocument(contractId, templateId)
      setPrintMarkdown(res.markdown || '')
    } catch {
      setPrintMarkdown('')
    } finally {
      setPrintLoading(false)
    }
  }

  return (
    <Modal
      title="打印合同文档"
      open
      onCancel={onClose}
      width={860}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          disabled={!printMarkdown}
          onClick={() => {
            const html = printPreviewRef.current?.innerHTML ?? ''
            const w = window.open('', '_blank', 'width=900,height=700')
            if (!w) return
            w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>打印合同</title>
                <style>
                  body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;line-height:1.8;padding:40px;color:#222;}
                  h1,h2,h3{margin:1.2em 0 .5em;} table{border-collapse:collapse;width:100%;margin:12px 0;}
                  th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;} th{background:#f5f5f5;}
                  hr{border:none;border-top:1px solid #ddd;margin:16px 0;} img{max-width:100%;}
                </style></head><body>${html}</body></html>`)
            w.document.close()
            w.focus()
            setTimeout(() => w.print(), 300)
          }}
        >
          打印
        </Button>,
      ]}
    >
      <Space style={{ width: '100%', marginBottom: 16 }}>
        <span>选择模板:</span>
        <Select
          style={{ width: 360 }}
          placeholder="选择合同模板"
          value={printTplId}
          options={printTemplates.map((t) => ({ label: t.name, value: t.id }))}
          onChange={handlePrintRender}
        />
      </Space>
      <Spin spinning={printLoading}>
        {printMarkdown ? (
          <div
            ref={printPreviewRef}
            className="prose-content max-w-none"
            style={{
              minHeight: 200,
              lineHeight: 1.8,
              color: '#222',
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }: { children?: ReactNode }) => (
                  <h1 style={{ fontSize: 20, margin: '1.2em 0 .5em' }}>{children}</h1>
                ),
                h2: ({ children }: { children?: ReactNode }) => (
                  <h2 style={{ fontSize: 17, margin: '1.2em 0 .5em' }}>{children}</h2>
                ),
                table: ({ children }: { children?: ReactNode }) => (
                  <table style={{ borderCollapse: 'collapse', width: '100%', margin: '12px 0' }}>{children}</table>
                ),
                th: ({ children }: { children?: ReactNode }) => (
                  <th style={{ border: '1px solid #ddd', padding: '8px 12px', background: '#f5f5f5', textAlign: 'left' }}>
                    {children}
                  </th>
                ),
                td: ({ children }: { children?: ReactNode }) => (
                  <td style={{ border: '1px solid #ddd', padding: '8px 12px', textAlign: 'left' }}>{children}</td>
                ),
              }}
            >
              {printMarkdown}
            </ReactMarkdown>
          </div>
        ) : (
          <div style={{ color: '#999', textAlign: 'center', padding: 40 }}>
            请选择模板预览渲染结果
          </div>
        )}
      </Spin>
    </Modal>
  )
}
