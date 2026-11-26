import { useCallback, useEffect, useState } from 'react'
import {
  App,
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tabs,
} from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import Auth from '../../../components/Auth'
import { getStageConfig, updateStageConfig } from '../../../services/crm'
import { OPPORTUNITY_REQUIRED_FIELD_OPTIONS, type StageDef } from '../../../types/crm'

type BizType = 'OPPORTUNITY' | 'CONTRACT'

/** 表单行, _existing 标记是否为服务端已有阶段(已有行 key 不可改) */
interface StageRow extends StageDef {
  _existing?: boolean
}

interface StageFormValues {
  stages: StageRow[]
}

const COLOR_OPTIONS = ['blue', 'green', 'orange', 'red', 'purple', 'cyan', 'geekblue', 'magenta']

/** antd 预设色对应的前景色,用于色点展示 */
const COLOR_DOT: Record<string, string> = {
  blue: '#1677ff',
  green: '#52c41a',
  orange: '#fa8c16',
  red: '#f5222d',
  purple: '#722ed1',
  cyan: '#13c2c2',
  geekblue: '#2f54eb',
  magenta: '#eb2f96',
}

function StageEditor({ bizType }: { bizType: BizType }) {
  const { message } = App.useApp()
  const [form] = Form.useForm<StageFormValues>()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getStageConfig(bizType)
      const stages: StageRow[] = [...(res.stages ?? [])]
        .sort((a, b) => a.sort - b.sort)
        .map((s) => ({ ...s, _existing: true }))
      form.setFieldsValue({ stages })
    } finally {
      setLoading(false)
    }
  }, [bizType, form])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    const { stages = [] } = await form.validateFields()
    setSaving(true)
    try {
      // 按表单顺序重新编号 sort,并去掉行内标记字段;商机新增配置显式提交,避免保存时丢失
      const payload: StageDef[] = stages.map((s, i) => {
        const base: StageDef = {
          key: s.key,
          label: s.label,
          color: s.color ?? '',
          sort: i,
          probability: s.probability ?? 0,
        }
        if (bizType === 'OPPORTUNITY') {
          return {
            ...base,
            guidance: s.guidance ?? '',
            required_fields: s.required_fields ?? [],
            require_followup: Boolean(s.require_followup),
            stagnant_days: s.stagnant_days ?? 0,
          }
        }
        return base
      })
      await updateStageConfig(bizType, payload)
      message.success('阶段配置已保存')
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Spin spinning={loading}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="阶段 key 一旦使用不建议修改;已成交/已丢失类收尾阶段请保留。"
      />
      <Form form={form} autoComplete="off" layout="vertical">
        <Form.List name="stages">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => {
                const existing = !!form.getFieldValue(['stages', field.name, '_existing'])
                return (
                  <Card
                    key={field.key}
                    size="small"
                    title={`阶段 ${field.name + 1}`}
                    extra={
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(field.name)}
                        aria-label="删除阶段"
                      />
                    }
                    style={{ marginBottom: 16 }}
                  >
                    <Form.Item name={[field.name, '_existing']} hidden initialValue={false}>
                      <Input />
                    </Form.Item>
                    <Row gutter={[16, 8]}>
                      <Col xs={24} md={12} xl={6}>
                        <Form.Item
                          name={[field.name, 'key']}
                          label="阶段 KEY"
                          rules={[{ required: true, message: '请输入阶段KEY' }]}
                        >
                          <Input placeholder="阶段KEY如 PROSPECTING" disabled={existing} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12} xl={6}>
                        <Form.Item
                          name={[field.name, 'label']}
                          label="显示名"
                          rules={[{ required: true, message: '请输入显示名' }]}
                        >
                          <Input placeholder="显示名" />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={6} xl={4}>
                        <Form.Item name={[field.name, 'color']} label="颜色">
                          <Select
                            allowClear
                            placeholder="颜色"
                            options={COLOR_OPTIONS.map((c) => ({ label: c, value: c }))}
                            optionRender={(option) => (
                              <Space size={8}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    backgroundColor: COLOR_DOT[String(option.value)] ?? '#999',
                                  }}
                                />
                                {option.label}
                              </Space>
                            )}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={6} xl={4}>
                        <Form.Item name={[field.name, 'sort']} label="排序">
                          <InputNumber placeholder="排序" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12} xl={6}>
                        <Form.Item name={[field.name, 'probability']} label="成交概率(%)">
                          <InputNumber min={0} max={100} placeholder="概率%" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    {bizType === 'OPPORTUNITY' && (
                      <Row gutter={[16, 8]}>
                        <Col span={24}>
                          <Form.Item name={[field.name, 'guidance']} label="阶段说明">
                            <Input.TextArea
                              rows={2}
                              placeholder="说明该阶段的目标、推进要点与注意事项"
                              maxLength={1000}
                              showCount
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} lg={12}>
                          <Form.Item name={[field.name, 'required_fields']} label="资料要求">
                            <Select
                              mode="multiple"
                              allowClear
                              placeholder="选择流转到该阶段时要求补充的资料"
                              options={OPPORTUNITY_REQUIRED_FIELD_OPTIONS.map((item) => ({ ...item }))}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={12} lg={6}>
                          <Form.Item
                            name={[field.name, 'require_followup']}
                            label="要求跟进记录"
                            valuePropName="checked"
                          >
                            <Switch checkedChildren="是" unCheckedChildren="否" />
                          </Form.Item>
                        </Col>
                        <Col xs={12} lg={6}>
                          <Form.Item
                            name={[field.name, 'stagnant_days']}
                            label="停滞预警天数"
                            tooltip="填 0 表示不启用停滞预警"
                          >
                            <InputNumber min={0} precision={0} placeholder="天数" style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                      </Row>
                    )}
                  </Card>
                )
              })}
              <Form.Item>
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() =>
                    add({
                      _existing: false,
                      ...(bizType === 'OPPORTUNITY'
                        ? { guidance: '', required_fields: [], require_followup: false, stagnant_days: 0 }
                        : {}),
                    })
                  }
                >
                  添加阶段
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
      <Space style={{ marginTop: 8 }}>
        <Auth perm="crm:stage:edit">
          <Button type="primary" loading={saving} onClick={handleSave}>
            保存
          </Button>
        </Auth>
        <Button onClick={load} disabled={loading || saving}>
          重置
        </Button>
      </Space>
    </Spin>
  )
}

export default function StagePage() {
  return (
    <Card>
      <Tabs
        defaultActiveKey="OPPORTUNITY"
        items={[
          {
            key: 'OPPORTUNITY',
            label: '商机阶段',
            children: <StageEditor bizType="OPPORTUNITY" />,
          },
          {
            key: 'CONTRACT',
            label: '合同阶段',
            children: <StageEditor bizType="CONTRACT" />,
          },
        ]}
      />
    </Card>
  )
}
