import { ReloadOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Divider, Drawer, Input, Slider, Space, Switch, Tooltip, Typography, message } from 'antd'
import { useState } from 'react'
import { useSettingsStore } from '../../stores/settings'

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <Typography.Text>{label}</Typography.Text>
      <span style={{ width: 180 }}>{children}</span>
    </div>
  )
}

/** 布局/主题设置抽屉,入口为顶栏设置图标 */
export default function LayoutSettings() {
  const { colorPrimary, borderRadius, darkMode, setSettings, resetSettings } = useSettingsStore()
  const [open, setOpen] = useState(false)

  const reset = () => {
    resetSettings()
    message.success('配置已重置')
  }

  return (
    <>
      <Tooltip title="布局设置">
        <Button
          type="text"
          className="qzt-header-icon"
          icon={<SettingOutlined />}
          aria-label="布局设置"
          onClick={() => setOpen(true)}
        />
      </Tooltip>
      <Drawer title="布局设置" open={open} onClose={() => setOpen(false)} width={320}>
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          主题风格设置
        </Typography.Title>
        <SettingRow label="主题颜色">
          <Input
            type="color"
            value={colorPrimary}
            onChange={(e) => setSettings({ colorPrimary: e.target.value, colorInfo: e.target.value })}
            style={{ width: '100%', height: 32, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
          />
        </SettingRow>
        <SettingRow label="深色模式">
          <Switch checked={darkMode} onChange={(v) => setSettings({ darkMode: v })} />
        </SettingRow>
        <SettingRow label="页面圆角">
          <Slider
            min={0}
            max={32}
            step={2}
            value={borderRadius}
            onChange={(v) => setSettings({ borderRadius: v })}
          />
        </SettingRow>
        <Divider />
        <Typography.Title level={5}>系统布局配置</Typography.Title>
        <SettingRow label="固定 Header">
          <Switch disabled />
        </SettingRow>
        <Space style={{ marginTop: 18 }}>
          <Button type="primary" icon={<SettingOutlined />} onClick={() => message.success('配置已保存')}>
            保存配置
          </Button>
          <Button icon={<ReloadOutlined />} onClick={reset}>
            重置配置
          </Button>
        </Space>
      </Drawer>
    </>
  )
}
