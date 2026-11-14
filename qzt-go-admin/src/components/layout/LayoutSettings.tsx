import {
  CheckOutlined,
  CopyOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import {
  Badge,
  Button,
  ColorPicker,
  Divider,
  Drawer,
  Segmented,
  Slider,
  Space,
  Switch,
  Tooltip,
  Typography,
  message,
} from 'antd'
import { useState } from 'react'
import { diffSettings, useSettingsStore } from '../../stores/settings'
import type { ThemeMode } from '../../stores/settings'

/** 预设主题色(取自 antd 官方色板,点击即换) */
const PRESET_COLORS = [
  { name: '拂晓蓝', value: '#1677ff' },
  { name: '极客蓝', value: '#2f54eb' },
  { name: '酱紫', value: '#722ed1' },
  { name: '明青', value: '#13c2c2' },
  { name: '极光绿', value: '#52c41a' },
  { name: '日暮', value: '#fa8c16' },
  { name: '薄暮', value: '#f5222d' },
]

/** 单行设置:左侧标题+说明,右侧控件 */
function SettingRow({
  label,
  description,
  children,
}: {
  label: React.ReactNode
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 28, gap: 12 }}>
        <Typography.Text>{label}</Typography.Text>
        {children}
      </div>
      {description && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
          {description}
        </Typography.Text>
      )}
    </div>
  )
}

/** 布局/主题设置抽屉,入口为顶栏设置图标 */
export default function LayoutSettings() {
  const settings = useSettingsStore()
  const { colorPrimary, themeMode, borderRadius, compactMode, colorWeak, multiTab, watermark, setSettings, resetSettings } = settings
  const [open, setOpen] = useState(false)

  // 与出厂默认的差异:非空=有改动(恢复默认/复制差异按钮的可用性与脏标记,同 vben 偏好面板)
  const dirty = Object.keys(diffSettings(settings)).length > 0

  const reset = () => {
    resetSettings()
    message.success('已恢复默认配置')
  }

  const copyDiff = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(diffSettings(settings), null, 2))
    } catch {
      message.error('复制失败,请检查浏览器剪贴板权限')
    }
  }

  return (
    <>
      <Tooltip title="布局设置">
        <Button
          type="text"
          className="qzt-header-icon"
          icon={<SettingOutlined />}
          aria-label="布局设置"
          data-guide="global:settings"
          onClick={() => setOpen(true)}
        />
      </Tooltip>
      <Drawer title="布局设置" open={open} onClose={() => setOpen(false)} width={340}>
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          主题风格
        </Typography.Title>

        {/* 外观模式:浅色/深色/跟随系统(vben 偏好面板同款三态) */}
        <SettingRow label="外观模式" description="深色背景降低视觉疲劳;「跟随系统」按操作系统的深色偏好自动切换">
          <Segmented
            value={themeMode}
            onChange={(v) => setSettings({ themeMode: v as ThemeMode })}
            options={[
              { label: '浅色', value: 'light' },
              { label: '深色', value: 'dark' },
              { label: '跟随系统', value: 'auto' },
            ]}
          />
        </SettingRow>

        {/* 主题色:预设色板 + 自定义取色器 */}
        <SettingRow label="主题色" description="点击预设色块快速切换,或用取色器自定义">
          <Space size={8}>
            {PRESET_COLORS.map((c) => {
              const selected = c.value.toLowerCase() === colorPrimary.toLowerCase()
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-label={c.name}
                  aria-pressed={selected}
                  title={c.name}
                  onClick={() => setSettings({ colorPrimary: c.value, colorInfo: c.value })}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    padding: 0,
                    border: 'none',
                    background: c.value,
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s',
                  }}
                >
                  {selected && <CheckOutlined style={{ fontSize: 12 }} />}
                </button>
              )
            })}
            <ColorPicker
              value={colorPrimary}
              size="small"
              onChangeComplete={(c) => {
                const hex = c.toHexString()
                setSettings({ colorPrimary: hex, colorInfo: hex })
              }}
            >
              <Button size="small" type="text" aria-label="自定义颜色">
                自定义
              </Button>
              </ColorPicker>
          </Space>
        </SettingRow>

        <SettingRow label="色弱模式" description="增强对比,辅助色觉障碍用户">
          <Switch checked={colorWeak} onChange={(v) => setSettings({ colorWeak: v })} />
        </SettingRow>

        <Divider />

        <Typography.Title level={5}>界面布局</Typography.Title>

        <SettingRow label={<span>页面圆角 · {borderRadius} px</span>} description="控制卡片与按钮的圆角大小">
          <Slider
            min={0}
            max={16}
            step={1}
            value={borderRadius}
            onChange={(v) => setSettings({ borderRadius: v })}
            style={{ width: 160, margin: 0 }}
          />
        </SettingRow>

        <SettingRow label="紧凑模式" description="收紧间距与控件,提高信息密度">
          <Switch checked={compactMode} onChange={(v) => setSettings({ compactMode: v })} />
        </SettingRow>

        <SettingRow label="多页签模式" description="内容区顶部显示已打开页面的页签,切换时保留页面状态">
          <Switch checked={multiTab} onChange={(v) => setSettings({ multiTab: v })} />
        </SettingRow>

        <SettingRow label="页面水印" description="内容区平铺显示当前登录用户,防止截屏外传时可溯源">
          <Switch checked={watermark} onChange={(v) => setSettings({ watermark: v })} />
        </SettingRow>

        <Divider />

        {/* persist 已即时持久化,无需「保存」按钮;复制差异=vben 偏好面板同款,当前与出厂默认的 diff JSON */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Tooltip title="复制当前设置与出厂默认的差异 JSON,可作为个人备份,或粘贴进代码作为新版本的出厂默认">
            <Button icon={<CopyOutlined />} disabled={!dirty} onClick={copyDiff}>
              复制差异
            </Button>
          </Tooltip>
          <Badge dot={dirty} offset={[-8, 6]}>
            <Button icon={<ReloadOutlined />} disabled={!dirty} onClick={reset} aria-label="恢复默认">
              恢复默认
            </Button>
          </Badge>
        </div>
      </Drawer>
    </>
  )
}
