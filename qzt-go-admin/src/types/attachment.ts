/** 附件(通用多态: biz_type + resource_id 关联任意业务实体) */

export interface Attachment {
  id: number
  /** 业务类型,如 CUSTOMER/CONTRACT/OPPORTUNITY */
  biz_type: string
  /** 资源ID */
  resource_id: number
  /** 原始文件名 */
  file_name: string
  /** 存储路径(OSS key 或本地相对路径) */
  object_key: string
  /** 访问URL(公共=明文直链;私有=objectKey,需走 /api/file/sign 取下载URL) */
  url: string
  /** 文件大小(字节) */
  size: number
  /** MIME 类型 */
  content_type: string
  /** 可见性: public / private */
  visibility: string
  /** 上传人ID */
  uploader_id: number
  created_at: string
  updated_at: string
}

/** 创建附件记录请求(前端上传文件后调用,落库元数据) */
export interface CreateAttachmentRequest {
  biz_type: string
  resource_id: number
  file_name: string
  object_key: string
  url: string
  size: number
  content_type: string
  /** public / private,留空默认 private */
  visibility: string
}

/** OSS 直传预签名响应(与后端 STSResult 对应) */
export interface UploadSTSResult {
  driver: 'oss' | 'local'
  /** OSS PUT 预签名 URL(driver=oss 时有效) */
  upload_url?: string
  /** 上传后访问 URL(公共桶=CDN明文;私有桶=objectKey) */
  file_url?: string
  /** 文件 MIME(PUT 时需带 Content-Type) */
  content_type?: string
}

/** 后端上传响应 */
export interface UploadResult {
  original_name: string
  file_name: string
  path: string
  url: string
  size: number
  content_type: string
  visibility: string
  resource_domain: string
}

/** 签名下载 URL 响应 */
export interface SignResult {
  url: string
}
