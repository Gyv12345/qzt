/**
 * 配置常量
 *
 * 集中管理配置相关的常量值
 */

/**
 * 数据库提供商类型
 */
export const DATABASE_PROVIDER = {
  SQLITE: "sqlite",
  MYSQL: "mysql",
} as const;

export type DatabaseProvider =
  (typeof DATABASE_PROVIDER)[keyof typeof DATABASE_PROVIDER];

/**
 * 支持的文件类型
 */
export const FILE_TYPES = {
  IMAGE: "image",
  DOCUMENT: "document",
  VIDEO: "video",
  OTHER: "other",
} as const;

/**
 * 图片文件扩展名
 */
export const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
];

/**
 * 文档文件扩展名
 */
export const DOCUMENT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
];

/**
 * 视频文件扩展名
 */
export const VIDEO_EXTENSIONS = ["mp4", "avi", "mov", "wmv", "flv", "mkv"];

/**
 * MIME 类型映射
 */
export const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  mp4: "video/mp4",
  avi: "video/x-msvideo",
  mov: "video/quicktime",
};

/**
 * 限流默认配置
 */
export const THROTTLE_DEFAULTS = {
  TTL: 60000, // 60 秒
  LIMIT: 100, // 每分钟最多 100 次请求
} as const;

/**
 * Redis 默认配置
 */
export const REDIS_DEFAULTS = {
  PORT: 6379,
  DB: 0,
} as const;

/**
 * JWT 默认配置
 */
export const JWT_DEFAULTS = {
  EXPIRES_IN: "7d",
  MIN_SECRET_LENGTH: 32,
} as const;

/**
 * OSS 默认配置
 */
export const OSS_DEFAULTS = {
  PREFIX: "qzt/",
  SIGNATURE_EXPIRES: 3600, // 1 小时
} as const;
