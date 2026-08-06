/**
 * GField — grid 模式下支持 colSpan 的表单项包装。
 *
 * ProForm grid 模式下,colProps 只在 ProFormText 等 ProForm 系组件上生效。
 * 用 ProForm.Item 包裹的 antd 原生组件(Select/TreeSelect/DatePicker/Switch 等)
 * 的 colProps 会被忽略。GField 在 ProForm.Item 外面自动包一层 Col,解决此问题。
 *
 * 用法:把 <ProForm.Item name="x" label="Y" colProps={{ span: 12 }}>
 *      换成 <GField name="x" label="Y" colSpan={12}>
 */
import { Col } from 'antd'
import { ProForm } from '@ant-design/pro-components'
import type { FormItemProps } from 'antd'
import type { ReactNode } from 'react'

interface GFieldProps extends Omit<FormItemProps, 'children'> {
  /** 占用栅格宽度(1-24),默认 12(两列布局)。设为 24 则占满整行 */
  colSpan?: number
  children: ReactNode
}

export default function GField({ colSpan = 12, children, ...formItemProps }: GFieldProps) {
  return (
    <Col span={colSpan}>
      <ProForm.Item {...formItemProps}>{children}</ProForm.Item>
    </Col>
  )
}
