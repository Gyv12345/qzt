import type { PageGuide } from './types'

/** 全局布局引导:介绍顶栏/模块切换/侧边栏,登录后首次自动弹出 */
export const globalGuide: PageGuide = {
  key: 'global',
  title: '欢迎使用',
  tour: [
    {
      selector: '[data-guide="global:module-nav"]',
      title: '切换业务模块',
      description: '点击这里在 CRM、PSI、财务、OA、人事等业务模块之间切换。',
    },
    {
      selector: '[data-guide="global:side-primary"]',
      title: '页面导航',
      description: '左侧第一列是当前模块的页面分组/页面,若分组下还有子页面,会在第二列展开。',
    },
    {
      selector: '[data-guide="global:message"]',
      title: '消息通知',
      description: '铃铛里是站内实时消息(审批提醒、跟进提醒等),有新消息会显示未读数。',
    },
    {
      selector: '[data-guide="global:settings"]',
      title: '布局设置',
      description: '齿轮里可以调整主题色、深色/紧凑模式等界面偏好。',
    },
    {
      selector: '[data-guide="global:help"]',
      title: '随时找回引导',
      description: '以后忘了怎么操作,点这个「?」可以重新查看新手引导、当前页面引导,或重置所有引导。',
    },
  ],
  help: [],
}
