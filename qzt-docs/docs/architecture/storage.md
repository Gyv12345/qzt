---
sidebar_position: 6
sidebar_label: 文件存储
---

# 文件存储设计

平台所有文件（图片、合同、凭证、文档等）通过统一的**双桶模型**管理，存储后端**可配置化**：支持**本地磁盘（local）**、**阿里云 OSS（oss，原生 SDK）**、**S3 兼容（s3，minio-go）** 三种驱动，多套配置并存、单条生效，在管理端「系统管理 → 系统配置 → 文件存储」页**热切换、无需重启**，业务代码零改动。

## 双桶模型

文件按**可见性**分为公共桶与私有桶：

| 维度 | 公共桶（public） | 私有桶（private） |
| --- | --- | --- |
| 访问方式 | 直链 / CDN（任何人拿到 URL 都能访问） | 签名 GET URL（带过期时间，鉴权后才生成） |
| ACL | `public-read`（云存储）/ 目录静态 serve（local） | `private`（云存储）/ 后端代理鉴权（local） |
| `Content-Disposition` | `inline`（浏览器内联预览） | `attachment`（触发下载） |
| 典型内容 | 文章配图、Logo、头像、官网素材 | 合同扫描件、报销凭证、证件、薪资单 |
| 上传返回值 | 可直链的明文 URL | objectKey（非明文，落库用） |

**为什么私有桶返回 objectKey 而不是明文 URL？** 预签名 URL 会过期，存死了到期就失效。所以落库存 objectKey（如 `2026/08/07/a3f9...pdf`），前端访问时调 `/api/file/sign` 实时换一个短期 URL。

## 三种驱动

统一接口 `Uploader`（Save / SavePrivate / SaveBytes / SavePrivateBytes / SignURL / Delete / List）由三种驱动实现，按 `sys_storage_config` 表中 `driver` 字段（`local` / `oss` / `s3`）选择后端：

| 驱动 | 实现 | 适用场景 | 私有下载 |
| --- | --- | --- | --- |
| `local` | 服务器本地磁盘，公共目录 nginx 静态 serve | 内部部署、不想接对象存储 | `/api/file/dl?t=token&k=key` 后端代理 |
| `oss` | 阿里云 OSS 原生 SDK | 阿里云生态、CDN 加速 | 阿里云预签名 GET，浏览器直连 OSS |
| `s3` | **minio-go**（S3 兼容协议） | 七牛、MinIO、RustFS、腾讯云 COS 等 S3 兼容服务 | S3 `PresignedGetObject` 预签名 URL |

三种驱动的 `SignURL` 返回同样可用的短期 URL，业务侧无感知。

## 存储可配置化（v2）

存储配置已从 `config.{env}.yaml` 迁移到数据库表 **`sys_storage_config`**（配置文件仅作为首次启动的播种来源与 local 兜底）：

- **多配置并存、单条生效**：表内可保存多套配置（如「生产 OSS」「备份 MinIO」），`is_active=1` 的那条生效；
- **管理端热切换**：管理端点击「启用」，后端在**事务内**清全表生效标记 → 置目标行 → **构建新 Uploader 成功才提交**；提交后 `app.ReloadStorage` 热切换，所有上传/签名路径懒取新实例即刻生效，**无需重启**；
- **密钥脱敏**：列表接口对 `oss_access_key_secret` / `s3_secret_key` 只回尾 4 位（形如 `****abcd`）；保存时收到脱敏值（`****` 开头）则保留原值不覆盖；
- **连接测试**：保存后可一键「测试连接」，构建 Uploader 并做实际读写校验，通过后再启用。

### 管理入口

**系统管理 → 系统配置 → 文件存储**（菜单「文件存储」），提供：

| 功能 | 说明 |
|------|------|
| 配置列表 | 全部存储配置（生效标记、驱动、大小上限、密钥脱敏） |
| 新建 / 编辑 / 删除 | 三种驱动的表单按驱动类型动态渲染 |
| 启用（热切换） | 事务切换生效配置，即时生效 |
| 测试连接 | 校验连通性与凭据 |
| 文件列表 | 统一上传统一记录的文件总览（`GET /system/storage/files`） |

### 上传统一列表

管理端「文件存储」页提供管理员视角的**全量文件列表**（`GET /system/storage/files`）：跨用户列出网盘文件（联 `sys_user` 带上传人昵称），支持文件名关键词搜索；每行直接带下载地址——公共文件给直链、私有文件给短期签名 URL。

## 文件校验三层防护

`Save` / `SavePrivate` 共享一套校验逻辑：

1. **大小校验**：超过配置的单文件上限（默认 50MB，可按配置调整）直接拒。
2. **扩展名白名单**：不在白名单里的扩展名拒。默认允许 `jpg/jpeg/png/gif/webp/pdf/doc/docx/xls/xlsx/zip`。
3. **MIME 嗅探**：读文件头 512 字节用 `http.DetectContentType` 判真实类型，与扩展名声明的 MIME 不符则拒（防 `php` 改名 `jpg` 之类攻击）。

文件名统一用 16 字节 `crypto/rand` 生成十六进制串，消除用户原名带来的路径穿越和命名冲突。上传接口入口另有 `MaxBytesReader` 限制请求体，超大请求在读完前就被拒。

## 私有桶签名下载（各驱动统一口径）

私有文件访问统一走 `SignURL` 短链（默认有效期 1 小时），前端拿到的是可直接放 `<img src>` / `window.open` 的 URL，**不需要 Authorization header**：

| 驱动 | 短链形态 |
|------|---------|
| `oss` | 阿里云预签名 GET，浏览器直连 OSS 源站 |
| `s3` | S3 `PresignedGetObject`，浏览器直连对象存储 |
| `local` | `/api/file/dl?t=<token>&k=<objectKey>` 后端代理 |

local 驱动的代理下载有完整防护链：HMAC 签名 token 校验（密钥复用 `jwt.jwt_secret`）→ token 内 key 与 query `k` 一致 → `filepath.Clean` 防路径逃逸 → 确认解析后仍在私有目录内 → 流式返回。

:::note
云存储驱动下 `/api/file/dl` 不会被调用——它只是 local 驱动的兜底。云存储的私有下载全程走对象存储预签名 URL。
:::

## 前端直传（STS）

后端代传（`/api/upload`）会消耗服务器带宽和内存。大文件或高并发上传时，可走**前端直传**：后端只签发一个 PUT 预签名 URL，浏览器直接 PUT，后端零流量。

### 接口：`GET /api/upload/sts`

| 参数 | 说明 |
| --- | --- |
| `filename` | 文件名（用于推断扩展名和 content-type），必填 |
| `folder` | 存储文件夹（默认 `uploads`） |
| `private` | `true` 上传到私有桶；默认公共桶 |

签名有效期 15 分钟。PUT 时必须带 `Content-Type` header，且值要与签名时一致，否则签名校验失败。

:::note local 模式降级
`STS` 检测到 `driver=local` 时直接返回 `{driver: "local"}`，前端识别后改走 `/api/upload` 后端上传。
:::

## API 清单

| 接口 | 方法 | 用途 |
| --- | --- | --- |
| `/api/upload` | POST | 后端代传（公共桶直链 / 私有桶 objectKey） |
| `/api/upload/sts` | GET | 签发前端直传 PUT URL（local 降级返回 `{driver:"local"}`） |
| `/api/file/sign` | GET | 私有文件签发短期下载 URL（1h） |
| `/api/file/dl` | GET | local 驱动私有文件代理下载（token 鉴权） |
| `/system/storage/configs` | GET / POST / PUT / DELETE | 存储配置管理（见上文） |
| `/system/storage/configs/:id/activate` | POST | 启用配置（热切换） |
| `/system/storage/configs/:id/test` | POST | 测试连接 |
| `/system/storage/files` | GET | 全量文件列表（管理员视角，公共直链 / 私有签名 URL） |

## 哪些业务用到私有桶

私有存储主要服务于敏感业务文件：

- **CRM 合同**：合同附件、扫描件
- **OA 报销**：发票、费用凭证
- **HRM 薪资**：薪资单、考勤明细
- **通用附件系统**（`sys_attachment`，多态 `biz_type + resource_id`）：各模块通用附件

公共桶则承载 CMS 文章配图、站点 Logo、头像等可公开素材。

## 切换驱动与历史文件迁移

1. 在「文件存储」页新建目标驱动的配置（如 S3 兼容的 MinIO）；
2. 「测试连接」通过后点「启用」完成热切换——新上传立即走新驱动；
3. **历史文件**：切换只影响新文件。旧文件若存在旧介质上，需按需迁移对象并更新业务表里的 URL / objectKey，或让旧介质继续在线提供访问。

:::warning 切换提示
热切换即刻生效，但已签发的旧驱动签名短链在有效期内仍可继续使用（短链自带过期时间，不会因切换失效而悬挂报错）。
:::
