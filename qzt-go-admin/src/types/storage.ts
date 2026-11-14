/** 存储驱动类型 */
export type StorageDriver = 'local' | 'oss' | 's3'

/**
 * 存储配置(sys_storage_config,GET /system/storage/configs 列表项)。
 * 同一时刻仅一条 is_active=1 生效;切换生效仅影响新上传,存量文件地址不变、无需重启。
 * 密钥字段(oss_access_key_secret / s3_secret_key 等)后端已脱敏返回,形如 ****abcd,不回显明文。
 */
export interface StorageConfig {
  id: number
  name: string
  /** 存储驱动:local=本地磁盘 oss=阿里云OSS s3=S3兼容(MinIO/R2/七牛/腾讯COS等) */
  driver: StorageDriver
  /** 1=当前生效配置(全表仅一条) */
  is_active: number
  /** 单文件大小上限(MB) */
  max_upload_mb: number
  remark?: string

  // ---- driver=local ----
  /** 本地公共存储根目录(nginx 静态 serve) */
  local_path?: string
  /** 本地私有存储根目录(后端代理鉴权访问) */
  private_path?: string
  /** 公共资源访问域名 */
  resource_domain?: string
  /** 私有文件代理下载 URL 前缀 */
  download_prefix?: string

  // ---- driver=oss(阿里云原生,双桶共用 AK/SK) ----
  oss_endpoint?: string
  /** AccessKeyID,脱敏 ****abcd */
  oss_access_key_id?: string
  /** AccessKeySecret,脱敏 ****abcd */
  oss_access_key_secret?: string
  /** 公共桶(public-read) */
  oss_bucket_name?: string
  /** 公共桶自定义域名/CDN(空则用默认域名) */
  oss_custom_domain?: string
  /** 私有桶名称(留空禁用私有附件) */
  oss_private_bucket_name?: string
  /** 私有桶自定义域名(一般留空) */
  oss_private_custom_domain?: string

  // ---- driver=s3(七牛/MinIO/RustFS/腾讯COS/OSS-S3端点等,双桶) ----
  s3_endpoint?: string
  /** Region(部分厂商可空) */
  s3_region?: string
  /** 公共桶名称 */
  s3_bucket_public?: string
  /** 公共桶访问域名/CDN(空则 endpoint/bucket 拼 URL) */
  s3_domain_public?: string
  /** 私有桶名称(留空禁用私有附件) */
  s3_bucket_private?: string
  /** 私有桶自定义域名(签名 URL 用,一般留空) */
  s3_domain_private?: string
  /** AccessKey,脱敏 ****abcd */
  s3_access_key?: string
  /** SecretKey,脱敏 ****abcd */
  s3_secret_key?: string
  /** path-style 寻址(MinIO/RustFS/七牛等自建 S3 需开启,tinyint 0/1) */
  s3_path_style?: boolean | number

  created_at?: string
  updated_at?: string
}

/** 存储配置保存(新建/编辑)payload,密钥留空或 **** 开头表示不修改 */
export interface StorageConfigPayload {
  name?: string
  driver?: StorageDriver
  max_upload_mb?: number
  remark?: string
  local_path?: string
  private_path?: string
  resource_domain?: string
  download_prefix?: string
  oss_endpoint?: string
  oss_access_key_id?: string
  oss_access_key_secret?: string
  oss_bucket_name?: string
  oss_custom_domain?: string
  oss_private_bucket_name?: string
  oss_private_custom_domain?: string
  s3_endpoint?: string
  s3_region?: string
  s3_bucket_public?: string
  s3_domain_public?: string
  s3_bucket_private?: string
  s3_domain_private?: string
  s3_access_key?: string
  s3_secret_key?: string
  s3_path_style?: boolean
}

/** 存储文件列表项(GET /system/storage/files) */
export interface StorageFile {
  id: number
  name: string
  /** 字节 */
  size: number
  /** 上传人姓名 */
  uploader_name?: string
  created_at: string
  /** 下载地址(公共=直链,私有=带签名的短期 URL) */
  download_url: string
}
