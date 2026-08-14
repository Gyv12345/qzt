import { Button, Tooltip } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { useGuide } from './GuideProvider'

/**
 * 页面工具栏帮助按钮:放进各页 toolBarRender 末尾,点击打开当前页的使用帮助弹窗。
 * 当前页未接入向导(无 help 内容)时自动隐藏。
 */
export function GuideHelpButton() {
  const { pageKey, openHelp } = useGuide()
  const enabled = !!pageKey // openHelp 内部会再校验 help 非空
  if (!enabled) return null
  return (
    <Tooltip title="使用帮助">
      <Button
        key="guide-help"
        type="text"
        icon={<QuestionCircleOutlined />}
        onClick={() => openHelp(pageKey)}
      />
    </Tooltip>
  )
}
