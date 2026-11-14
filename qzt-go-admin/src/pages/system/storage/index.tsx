import { Tabs } from 'antd'
import ConfigTab from './ConfigTab'
import FilesTab from './FilesTab'

/**
 * 文件存储管理页(系统管理 → 系统配置 → 文件存储,菜单 path /system/storage)。
 *
 * Tab1 存储配置:多套存储配置(local / 阿里云 OSS / S3 兼容)统一管理,
 *   同一时刻仅一条配置生效,切换仅影响新上传,存量文件地址不受影响、无需重启。
 * Tab2 文件列表:平台全部上传文件的总览(文件名/大小/上传人/时间/下载)。
 */
export default function StoragePage() {
  return (
    <Tabs
      defaultActiveKey="config"
      destroyOnHidden
      items={[
        { key: 'config', label: '存储配置', children: <ConfigTab /> },
        { key: 'files', label: '文件列表', children: <FilesTab /> },
      ]}
    />
  )
}
