import { App, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { useGuide } from '../guide/GuideProvider'
import { pageGuides } from '../../guides'

/**
 * 顶栏全局帮助入口:重新查看全局/本页引导,或重置所有引导(恢复自动弹)。
 */
export default function HelpGuide() {
  const { message, modal } = App.useApp()
  const { pageKey, startTour, openHelp, resetAll } = useGuide()

  const currentPage = pageKey ? pageGuides[pageKey] : undefined

  const items: MenuProps['items'] = [
    { key: 'global', label: '查看新手引导' },
    // 当前页有向导内容时才提供本页入口
    ...(currentPage
      ? [
          { key: 'page-tour', label: `查看「${currentPage.title}」页面引导` },
          { key: 'page-help', label: `查看「${currentPage.title}」使用帮助` },
        ]
      : []),
    { type: 'divider' },
    { key: 'reset', label: '重新显示所有引导' },
  ]

  const onClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'global') startTour('global')
    else if (key === 'page-tour') startTour(pageKey)
    else if (key === 'page-help') openHelp(pageKey)
    else if (key === 'reset') {
      modal.confirm({
        title: '重新显示所有引导?',
        content: '将清空「已看过」记录,刷新页面后所有引导会重新自动弹出。',
        okText: '重置',
        onOk: () => {
          resetAll()
          message.success('已重置,刷新页面后生效')
        },
      })
    }
  }

  return (
    <Dropdown menu={{ items, onClick }} placement="bottomRight">
      <span className="qzt-header-icon" data-guide="global:help">
        <QuestionCircleOutlined />
      </span>
    </Dropdown>
  )
}
