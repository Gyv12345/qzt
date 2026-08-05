import type { ComponentType } from 'react'
import {
  ApartmentOutlined,
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BarsOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FolderOutlined,
  FundOutlined,
  GlobalOutlined,
  HomeOutlined,
  IdcardOutlined,
  ImportOutlined,
  InboxOutlined,
  KeyOutlined,
  LinkOutlined,
  MailOutlined,
  MenuOutlined,
  MessageOutlined,
  NotificationOutlined,
  PartitionOutlined,
  PictureOutlined,
  PlusOutlined,
  ProfileOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SafetyOutlined,
  ScheduleOutlined,
  SearchOutlined,
  SendOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  SolutionOutlined,
  SwapOutlined,
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
  ApartmentOutlined,
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BarsOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FolderOutlined,
  FundOutlined,
  GlobalOutlined,
  HomeOutlined,
  IdcardOutlined,
  ImportOutlined,
  InboxOutlined,
  KeyOutlined,
  LinkOutlined,
  MailOutlined,
  MenuOutlined,
  MessageOutlined,
  NotificationOutlined,
  PartitionOutlined,
  PictureOutlined,
  PlusOutlined,
  ProfileOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SafetyOutlined,
  ScheduleOutlined,
  SearchOutlined,
  SendOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  SolutionOutlined,
  SwapOutlined,
  TableOutlined,
  TagOutlined,
  TeamOutlined,
  ToolOutlined,
  TrophyOutlined,
  UnorderedListOutlined,
  UserOutlined,
}

/** Element Plus 风格别名(后端种子数据使用非 Outlined 命名) */
const aliases: Record<string, string> = {
  collection: 'BookOutlined',
  document: 'FileTextOutlined',
  tools: 'ToolOutlined',
  userfilled: 'TeamOutlined',
  setting: 'SettingOutlined',
  user: 'UserOutlined',
  menu: 'MenuOutlined',
  money: 'DollarOutlined',
  coin: 'DollarOutlined',
  tickets: 'DollarOutlined',
  dataanalysis: 'FundOutlined',
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
