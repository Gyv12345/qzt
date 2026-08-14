import { CheckOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, ColorPicker, Divider, Drawer, Slider, Space, Switch, Tooltip, Typography, message } from 'antd'
import { useState } from 'react'
import { useSettingsStore } from '../../stores/settings'

/** 预设主题色(取自 antd 官方色板,点击即换) */
const PRESET_COLORS = [
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
  const { colorPrimary, borderRadius, darkMode, compactMode, colorWeak, setSettings, resetSettings } =
    useSettingsStore()
  const [open, setOpen] = useState(false)

  const reset = () => {
    resetSettings()
    message.success('已恢复默认配置')
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
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
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

        <SettingRow label="深色模式" description="暗色背景,降低长时间使用的眼部疲劳">
          <Switch checked={darkMode} onChange={(v) => setSettings({ darkMode: v })} />
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

        <Divider />

        {/* persist 已即时持久化,无需「保存」按钮;仅保留恢复默认 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button icon={<ReloadOutlined />} onClick={reset}>
            恢复默认
          </Button>
        </div>
      </Drawer>
    </>
  )
}
