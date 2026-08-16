import { Button, Col, Empty, Popconfirm, Row, Tag } from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined } from '@ant-design/icons'
import Auth from '../../../components/Auth'
import type { CrmCustomField } from '../../../types/crm'
import CustomFieldItem from '../customer/CustomFields'
import { FIELD_META } from './fieldMeta'

interface FieldPreviewProps {
  fields: CrmCustomField[]
  label: string
  selectedId?: string
  onSelect: (id: string) => void
  onMove: (idx: number, dir: 'up' | 'down') => void
  onDelete: (id: string) => void
}

/** 中栏:表单预览(点击选中,悬浮上移/下移/删除) */
export default function FieldPreview({ fields, label, selectedId, onSelect, onMove, onDelete }: FieldPreviewProps) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: 16,
        minHeight: '72vh',
        border: '1px solid #f0f0f0',
      }}
    >
      <strong style={{ display: 'block', marginBottom: 12 }}>
        {label}表单预览
      </strong>
      {fields.length === 0 ? (
        <Empty description="点击左侧字段类型添加字段" style={{ marginTop: 100 }} />
      ) : (
        <Row gutter={[12, 12]}>
          {fields.map((f, idx) => {
            const selected = selectedId === f.id
            return (
              <Col span={f.type === 'DIVIDER' ? 24 : 12} key={f.id}>
                <div
                  className={`field-preview-item${selected ? ' is-selected' : ''}`}
                  onClick={() => onSelect(f.id)}
                  style={{
                    position: 'relative',
                    padding: '12px 12px 4px',
                    border: selected ? '1px solid #1677ff' : '1px solid transparent',
                    background: selected ? '#e6f4ff' : '#fafafa',
                    borderRadius: 6,
                    cursor: 'pointer',
                    minHeight: 48,
                    transition: 'border-color .15s',
                  }}
                >
                  {/* 操作按钮 */}
                  <div
                    className="field-actions"
                    style={{
                      position: 'absolute',
                      top: -10,
                      right: 6,
                      display: 'flex',
                      gap: 4,
                      zIndex: 2,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={idx <= 0}
                      onClick={() => onMove(idx, 'up')}
                    />
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={idx >= fields.length - 1}
                      onClick={() => onMove(idx, 'down')}
                    />
                    <Auth perm="crm:field:delete">
                      <Popconfirm
                        title="删除后已录入的该字段数据将不可见,确认删除?"
                        okText="删除"
                        okButtonProps={{ danger: true }}
                        cancelText="取消"
                        onConfirm={() => onDelete(f.id)}
                      >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Auth>
                  </div>
                  {/* 字段名 + 类型 */}
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</span>
                    <Tag style={{ marginLeft: 8, fontSize: 11 }}>
                      {FIELD_META[f.type]?.label || f.type}
                    </Tag>
                  </div>
                  {/* 预览控件 */}
                  <CustomFieldItem field={f} />
                </div>
              </Col>
            )
          })}
        </Row>
      )}
    </div>
  )
}
