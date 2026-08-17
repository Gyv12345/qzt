import { useRef, useState, useEffect } from 'react'
import { App, Button, Card, Col, Modal, Popconfirm, Row, Space, Tag } from 'antd'
import { PlusOutlined, FormOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { APPROVAL_STATUS_MAP, canResubmitApproval} from '../../../types/oa'
import { deleteFormData, listEnabledForms, listFormData, submitFormDataApproval } from '../../../services/oa'
import type { OaFormData, OaFormTemplate } from '../../../types/oa'
import DynamicFormFillModal from './FillModal'

export default function FormDataPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [fillOpen, setFillOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<OaFormTemplate | null>(null)
  const [templates, setTemplates] = useState<OaFormTemplate[]>([])
  const [chooseOpen, setChooseOpen] = useState(false)

  useEffect(() => {
    listEnabledForms().then((res) => setTemplates(res.list || []))
  }, [])

  const handleSubmitApproval = async (record: OaFormData) => {
    await submitFormDataApproval(record.id)
    message.success('已提交审批')
    actionRef.current?.reload()
  }

  const handleDelete = async (id: number) => {
    await deleteFormData(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const handleAddClick = () => {
    if (templates.length === 0) {
      message.warning('暂无可用表单,请联系管理员创建')
      return
    }
    if (templates.length === 1) {
      setSelectedTemplate(templates[0])
      setEditingId(null)
      setFillOpen(true)
    } else {
      setChooseOpen(true)
    }
  }

  const columns: ProColumns<OaFormData>[] = [
    { title: '编号', valueType: 'indexBorder', width: 60 },
    { title: '单号', dataIndex: 'data_no', width: 160, search: false },
    { title: '表单', dataIndex: 'template_name', width: 140 },
    {
      title: '标识',
      dataIndex: 'template_key',
      width: 120,
      valueType: 'select',
      valueEnum: Object.fromEntries(templates.map((t) => [t.form_key, { text: t.name }])),
      hideInTable: true,
    },
    {
      title: '审批状态',
      dataIndex: 'approval_status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        NONE: { text: '未提交' },
        APPROVING: { text: '审批中' },
        APPROVED: { text: '已通过' },
        REJECTED: { text: '已驳回' },
        REVOKED: { text: '已撤回' },
      },
      render: (_, r) => {
        const s = APPROVAL_STATUS_MAP[r.approval_status] ?? APPROVAL_STATUS_MAP.NONE
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    { title: '提交时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {canResubmitApproval(record.approval_status) && (
            <Popconfirm title="提交审批?" okText="提交" cancelText="取消" onConfirm={() => handleSubmitApproval(record)}>
              <Button type="link" size="small">提交审批</Button>
            </Popconfirm>
          )}
          {canResubmitApproval(record.approval_status) && (
            <Auth perm="oa:formdata:edit">
              <Button type="link" size="small" onClick={() => {
                const tpl = templates.find((t) => t.id === record.template_id)
                if (tpl) {
                  setSelectedTemplate(tpl)
                  setEditingId(record.id)
                  setFillOpen(true)
                } else {
                  message.warning('表单模板不存在')
                }
              }}>编辑</Button>
            </Auth>
          )}
          {record.approval_status === 'NONE' && (
            <Auth perm="oa:formdata:delete">
              <Popconfirm title="确认删除?" okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => handleDelete(record.id)}>
                <Button type="link" size="small" danger>删除</Button>
              </Popconfirm>
            </Auth>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<OaFormData>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listFormData({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="oa:formdata:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddClick}>填写表单</Button>
          </Auth>,
        ]}
        headerTitle="表单提交"
      />

      {/* 选择表单模板 */}
      <Modal
        title="选择表单"
        open={chooseOpen}
        onCancel={() => setChooseOpen(false)}
        footer={null}
        width={640}
      >
        <Row gutter={[16, 16]}>
          {templates.map((t) => (
            <Col key={t.id} span={8}>
              <Card
                hoverable
                size="small"
                onClick={() => {
                  setSelectedTemplate(t)
                  setEditingId(null)
                  setChooseOpen(false)
                  setFillOpen(true)
                }}
              >
                <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                  <FormOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                  <span style={{ fontWeight: 500 }}>{t.name}</span>
                  {t.description && <span style={{ fontSize: 12, color: '#999' }}>{t.description}</span>}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Modal>

      {/* 填写表单 */}
      {selectedTemplate && (
        <DynamicFormFillModal
          open={fillOpen}
          editingId={editingId}
          template={selectedTemplate}
          onOpenChange={(v) => {
            setFillOpen(v)
            if (!v) setSelectedTemplate(null)
          }}
          onSuccess={() => actionRef.current?.reload()}
        />
      )}
    </>
  )
}
