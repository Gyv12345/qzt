---
sidebar_position: 5
sidebar_label: 文件存储
---

# 文件存储设计

平台所有文件（图片、合同、凭证、文档等）通过统一的 **双桶模型** 管理，支持**本地磁盘**与**阿里云 OSS** 两种驱动，通过配置一行切换，业务代码零改动。

## 双桶模型

文件按**可见性**分为公共桶与私有桶：

| 维度 | 公共桶（public） | 私有桶（private） |
| --- | --- | --- |
| 访问方式 | 直链 / CDN（任何人拿到 URL 都能访问） | 签名 GET URL（带过期时间，鉴权后才生成） |
| ACL | `public-read`（OSS）/ 目录静态 serve（local） | `private`（OSS）/ 后端代理鉴权（local） |
| `Content-Disposition` | `inline`（浏览器内联预览） | `attachment`（触发下载） |
| 典型内容 | 文章配图、Logo、头像、官网素材 | 合同扫描件、报销凭证、证件、薪资单 |
| 上传返回值 | 可直链的明文 URL | objectKey（非明文，落库用） |

**为什么私有桶返回 objectKey 而不是明文 URL？** 预签名 URL 会过期，存死了到期就失效。所以落库存 objectKey（如 `2026/08/07/a3f9...pdf`），前端访问时调 `/api/file/sign` 实时换一个短期 URL。

两种驱动对双桶的实现：

| 驱动 | 公共桶 | 私有桶 |
| --- | --- | --- |
| `local` | 公共目录（nginx 静态 serve） | 私有目录（`/api/file/dl` 后端代理鉴权，nginx 不直接 serve） |
| `oss` | `public-read` 桶 + CDN | `private` 桶（阿里云预签名 GET） |

公共桶和私有桶**共用同一组 AK/SK**，只是桶名不同。私有桶名留空 → 私有功能降级（`SavePrivate` / `SignURL` 返回错误）。

## 统一接口

后端定义统一接口，本地与 OSS 都实现它，启动时按 `config.driver` 切换：

```go
type Uploader interface {
    // Save 存到公共桶。不指定 folder 则按 YYYY/MM/DD 日期分目录。返回可直链 URL。
    Save(file *multipart.FileHeader, folders ...string) (*UploadedFile, error)

    // SavePrivate 存到私有桶。返回的 URL 是 objectKey，需另调 SignURL 取下载 URL。
    SavePrivate(file *multipart.FileHeader, folders ...string) (*UploadedFile, error)

    // SignURL 为私有文件生成短期下载 URL。
    //   OSS：阿里云预签名 GET；local：/api/file/dl?t=jwt&k=key（后端代理）
    SignURL(objectKey string, ttl time.Duration) (string, error)
}
```

### 文件校验三层防护

`Save` / `SavePrivate` 共享一套校验逻辑：

1. **大小校验**：超过 `max_upload_mb`（默认 20MB）直接拒。
2. **扩展名白名单**：不在白名单里的扩展名拒。默认允许 `jpg/jpeg/png/gif/webp/pdf/doc/docx/xls/xlsx/zip`。
3. **MIME 嗅探**：读文件头 512 字节用 `http.DetectContentType` 判真实类型，与扩展名声明的 MIME 不符则拒（防 `php` 改名 `jpg` 之类攻击）。

文件名统一用 16 字节 `crypto/rand` 生成十六进制串，消除用户原名带来的路径穿越和命名冲突。

## 驱动一：本地存储（local）

默认驱动，适合**内部部署**或不想接对象存储的场景。

### 目录结构

```
storage/
├── public/                  # 公共目录（nginx 静态 serve，可直链）
│   └── 2026/08/07/a3f9....png
└── private/                 # 私有目录（nginx 不 serve，只能走 /api/file/dl）
    └── 2026/08/07/b7c2....pdf
```

### 上传流程

1. 校验大小 + 扩展名 + MIME。
2. 解析目标目录（自定义 folder 或当天日期）。
3. 生成随机文件名，先写到同目录的临时文件 `.upload-*`。
4. **写满校验**：`io.Copy` 用 `LimitReader(content, maxBytes+1)`，若实际写入超过上限则判定超大（防 multipart 分块绕过 `file.Size` 头）。
5. `os.Rename` 原子改名到目标路径（rename 是原子操作，避免半成品文件被访问）。
6. `chmod 644`，返回 `URL = resourceDomain + "/" + relativePath`。

私有目录上传逻辑完全一致，只是写到 `privateDir`，返回的 URL 是 objectKey（不含域名）。

### 私有文件签名下载

私有文件不能直接 nginx serve，前端拿到的是后端代理 URL：

```
/api/file/dl?t=<token>&k=<objectKey>
```

token = `base64url(payload) + "." + base64url(hmac-sha256(payload, secret))`，payload = `<expUnixSec>|<objectKey>`。签名密钥复用 `jwt.jwt_secret`。这个 URL **不需要 Authorization header**，可直接放 `<img src>` 或 `window.open`。

下载接口的防护链：

1. 校验 HMAC 签名 + 未过期。
2. token 内的 key 必须与 query 的 `k` 一致（防篡改指向别的文件）。
3. `filepath.Clean` 防路径逃逸，再确认不含 `..`。
4. 解析绝对路径，确认仍在私有目录内。
5. 流式返回。

## 驱动二：阿里云 OSS（oss）

生产环境推荐驱动。文件不经后端落盘，直接传到 OSS，天然支持 CDN 加速、弹性容量、跨地域复制。

### 上传流程

1. 校验大小 + 扩展名 + MIME（与 local 共用）。
2. 解析目录 + 随机文件名。
3. `bucket.PutObject` 上传，显式带三个 option：
   - `ContentType` —— 让浏览器按真实类型渲染。
   - `ContentDisposition("inline")` —— 公共桶允许内联预览。
   - `ObjectACL(ACLPublicRead)` —— 显式 public-read，即使桶默认 ACL 变了也不受影响。
4. 拼接 URL：有 CDN 域名用 CDN，否则用默认 `https://{bucket}.{endpoint}/{key}`。

私有桶上传改成写 `privateBucket`，option 改为 `ContentDisposition("attachment")` + `ACLPrivate`，URL 存 objectKey。

### 私有文件签名下载

直接用阿里云 SDK 的 `bucket.SignURL` 生成带签名和过期时间的预签名 URL，**浏览器直连 OSS 源站**，不经后端。默认有效期 1 小时。

:::note
OSS 模式下 `/api/file/dl` 这个代理接口**不会被调用**——它只是 local 模式的兜底。OSS 模式的私有下载全程走阿里云签名 URL。
:::

## 前端直传 OSS（STS）

后端代传（`/api/upload`）会消耗服务器带宽和内存。大文件或高并发上传时，推荐**前端直传**：后端只签发一个 PUT 预签名 URL，浏览器直接 PUT 到 OSS，后端零流量。

### 接口：`GET /api/upload/sts`

| 参数 | 说明 |
| --- | --- |
| `filename` | 文件名（用于推断扩展名和 content-type），必填 |
| `folder` | 存储文件夹（默认 `uploads`） |
| `private` | `true` 上传到私有桶；默认公共桶 |

返回：

```json
{
  "driver": "oss",
  "upload_url": "https://bucket.oss-cn-hangzhou.aliyuncs.com/uploads/20260807/a3f9.pdf?Expires=...&Signature=...",
  "file_url": "https://cdn.devlovecode.com/uploads/20260807/a3f9.pdf",
  "content_type": "application/pdf"
}
```

前端流程：

1. `GET /api/upload/sts?filename=xx.pdf` → 拿到 `upload_url` + `file_url`
2. `fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': content_type } })`
3. 把 `file_url` 存到业务表（如合同附件字段）

签名有效期 15 分钟，足够大文件上传。PUT 时必须带 `Content-Type` header，且值要与签名时一致，否则签名校验失败。

:::note local 模式降级
`STS` 检测到 `driver != oss` 时直接返回 `{driver: "local"}`，前端识别后改走 `/api/upload` 后端上传。
:::

## API 清单

| 接口 | 方法 | 用途 | 适用驱动 |
| --- | --- | --- | --- |
| `/api/upload` | POST | 后端代传（公共桶 / 私有桶） | local + oss |
| `/api/upload/sts` | GET | 签发前端直传 PUT URL | oss（local 降级返回 `{driver:"local"}`） |
| `/api/file/sign` | GET | 私有文件签发短期下载 URL（1h） | local + oss |
| `/api/file/dl` | GET | 本地私有文件代理下载（token 鉴权） | local（oss 不走此接口） |

上传接口在入口用 `MaxBytesReader` 限制请求体大小（`max_upload_mb * 1MB + 1MB` 余量），超大的请求在读完前就被拒，避免内存吃满。

## 哪些业务用到私有桶

私有存储主要服务于敏感业务文件：

- **CRM 合同**：合同附件、扫描件
- **OA 报销**：发票、费用凭证
- **HRM 薪资**：薪资单、考勤明细
- **通用附件系统**（`sys_attachment`，多态 `biz_type + resource_id`）：各模块通用附件

公共桶则承载 CMS 文章配图、站点 Logo、头像等可公开素材。

## 配置

存储配置在 `config.{env}.yaml` + `.env`，**已从数据库表迁移到配置文件**，改配置需重启服务。

### OSS 模式最小配置

```bash
# .env
STORAGE_DRIVER=oss
OSS_ENDPOINT="oss-cn-hangzhou.aliyuncs.com"
OSS_ACCESS_KEY_ID="LTAI..."
OSS_ACCESS_KEY_SECRET="..."
OSS_BUCKET_NAME="qzt-public"                    # 公共桶(public-read)
OSS_CUSTOM_DOMAIN="https://cdn.devlovecode.com"
OSS_PRIVATE_BUCKET_NAME="qzt-private"           # 私有桶(private)
# OSS_PRIVATE_CUSTOM_DOMAIN=""                  # 一般留空
```

### local 模式最小配置

```bash
# .env
STORAGE_DRIVER=local
# 其余用 config.yaml 默认值：./storage/public + ./storage/private + http://localhost:9000
```

:::warning 不支持热重载
配置切换**有意不支持热重载**：中途切换 Uploader 会让旧签名 URL 失效，造成下载中断。切换驱动需重启服务。
:::

## 切换驱动与迁移

### 从 local 切到 OSS

1. 在 OSS 控制台建两个桶：公共桶设 `public-read`，私有桶设 `private`。
2. （可选）给公共桶绑定 CDN 域名（如 `cdn.yourdomain.com`）。
3. 配置 `.env` 填入 OSS 参数，`STORAGE_DRIVER=oss`。
4. 重启服务。
5. **历史文件**：local 模式存的文件 URL 是 `http://domain/2026/.../xx.png`，切 OSS 后新文件走 OSS 域名。旧文件需手工迁移（`ossutil cp storage/public/* oss://bucket/ -r`）并更新数据库里的 URL，或保持 local 目录在线 serve 旧文件直到自然过期。

:::note 测试连接
部署前可在后端控制台用同一组 AK/SK 验证连通性，或调用 OSS 提供的连通性测试工具。
:::
