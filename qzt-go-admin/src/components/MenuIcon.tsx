import type { ComponentType } from 'react'
import {
  ApiOutlined,
  AppstoreOutlined,
  BarsOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  FolderOutlined,
  GlobalOutlined,
  HomeOutlined,
  IdcardOutlined,
  KeyOutlined,
  LinkOutlined,
  MenuOutlined,
  MessageOutlined,
  NotificationOutlined,
  PictureOutlined,
  PlusOutlined,
  ProfileOutlined,
  ReloadOutlined,
  SafetyOutlined,
  SearchOutlined,
  SettingOutlined,
  ShopOutlined,
  TableOutlined,
  TagOutlined,
  TeamOutlined,
  ToolOutlined,
  TrophyOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons'

type IconComponent = ComponentType<{ className?: string }>

/** 可选图标集合(key 为 antd 图标组件名) */
const icons: Record<string, IconComponent> = {
  ApiOutlined,
  AppstoreOutlined,
  BarsOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  FolderOutlined,
  GlobalOutlined,
  HomeOutlined,
  IdcardOutlined,
  KeyOutlined,
  LinkOutlined,
  MenuOutlined,
  MessageOutlined,
  NotificationOutlined,
  PictureOutlined,
  PlusOutlined,
  ProfileOutlined,
  ReloadOutlined,
  SafetyOutlined,
  SearchOutlined,
  SettingOutlined,
  ShopOutlined,
  TableOutlined,
  TagOutlined,
  TeamOutlined,
  ToolOutlined,
  TrophyOutlined,
  UnorderedListOutlined,
  UserOutlined,
}

/** Element Plus 风格别名(后端种子数据使用) */
const aliases: Record<string, string> = {
  collection: 'BookOutlined',
  document: 'FileTextOutlined',
  tools: 'ToolOutlined',
  userfilled: 'TeamOutlined',
}

const normalized = new Map<string, IconComponent>()
for (const [name, comp] of Object.entries(icons)) {
  normalized.set(name.toLowerCase(), comp)
  const bare = name.replace(/(Outlined|Filled|TwoTone)$/i, '').toLowerCase()
  if (!normalized.has(bare)) normalized.set(bare, comp)
}
for (const [alias, target] of Object.entries(aliases)) {
  const comp = icons[target]
  if (comp) normalized.set(alias, comp)
}

/** 按名称渲染菜单图标,未命中时返回 null */
export default function MenuIcon({ icon }: { icon?: string }) {
  if (!icon) return null
  const Comp = normalized.get(icon.toLowerCase())
  return Comp ? <Comp /> : null
}

/** 图标选择器选项 */
export const iconOptions = Object.keys(icons).map((name) => ({ label: name, value: name }))

export { icons as iconComponents }
