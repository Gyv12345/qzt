# 支付证书管理

本文档说明如何管理和配置支付系统的证书文件。

## 目录结构

```
certificates/
├── wechat/
│   ├── development/        # 开发/测试环境
│   │   ├── apiclient_cert.p12
│   │   ├── apiclient_key.pem
│   │   ├── platform_public_key.pem
│   │   └── api_key.txt
│   └── production/         # 生产环境
│       └── ...
└── alipay/
    ├── development/
    │   ├── alipay_private_key.txt
    │   └── alipay_public_key.txt
    └── production/
        └── ...
```

## 证书获取

### 微信支付

1. **登录商户平台**
   - 访问 [微信支付商户平台](https://pay.weixin.qq.com/)
   - 使用商户号账号登录

2. **下载API证书**
   - 进入「账户中心 → API安全 → API证书」
   - 下载证书(apiclient_cert.p12和apiclient_key.pem)
   - 保存到对应环境的目录

3. **获取平台公钥**
   - 进入「账户中心 → API安全 → API证书」
   - 查看并保存平台公钥(platform_public_key.pem)

4. **获取API密钥**
   - 进入「账户中心 → API安全 → API密钥」
   - 设置并保存API密钥(api_key.txt)

### 支付宝

1. **登录开放平台**
   - 访问 [支付宝开放平台](https://open.alipay.com/)
   - 使用开发者账号登录

2. **生成RSA密钥对**
   - 进入「控制台 → 应用信息 → 开发信息 → 接口内容加密方式」
   - 使用OpenSSL生成密钥对:
     ```bash
     openssl genrsa -out alipay_private_key.txt 2048
     openssl rsa -in alipay_private_key.txt -pubout -out alipay_public_key.txt
     ```

3. **上传公钥到支付宝**
   - 将生成的公钥上传到支付宝开放平台
   - 保存支付宝公钥到本地

## 文件权限

证书文件包含敏感信息,必须设置正确的权限:

```bash
# 设置证书文件权限为仅所有者可读写
chmod 600 certificates/*/*

# 设置证书目录所有者
chown -R app:app certificates/
```

## 环境变量配置

如果不使用文件存储,可以通过环境变量配置证书:

```env
# 微信支付
WECHAT_APP_ID=wxXXXXXXXXXXXXXXXX
WECHAT_MCH_ID=1XXXXXXXXX
WECHAT_CERT_SERIAL_NO=XXXXXXXXXXXXXXXX
WECHAT_APICLIENT_CERT=<base64 encoded certificate>
WECHAT_PRIVATE_KEY=<base64 encoded private key>
WECHAT_PUBLIC_KEY=<base64 encoded public key>
WECHAT_API_KEY=your_api_key_here

# 支付宝
ALIPAY_APP_ID=202XXXXXXXXXXXXXXXX
ALIPAY_PRIVATE_KEY=<base64 encoded private key>
ALIPAY_PUBLIC_KEY=<base64 encoded public key>
```

## 测试模式

开发环境无需证书,使用Mock模式:

```env
PAYMENT_MODE=mock
```

## 证书管理API

系统提供证书管理API,可以通过API上传和管理证书:

### 保存证书
```bash
POST /api/payment-certificates/save
Content-Type: application/json
Authorization: Bearer <token>

{
  "paymentMethod": "wechat",
  "certificateType": "WECHAT_PRIVATE_KEY",
  "certContent": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
  "environment": "development"
}
```

### 验证证书配置
```bash
POST /api/payment-certificates/verify
Content-Type: application/json
Authorization: Bearer <token>

{
  "paymentMethod": "wechat",
  "environment": "development"
}
```

### 列出所有证书
```bash
GET /api/payment-certificates/list
Authorization: Bearer <token>
```

## 安全建议

1. **证书文件保护**
   - 使用文件系统权限限制访问(600权限)
   - 不要将证书提交到版本控制系统
   - 定期轮换证书

2. **传输安全**
   - 使用HTTPS传输证书内容
   - 加密存储在数据库中的证书

3. **访问控制**
   - 仅允许授权用户访问证书管理API
   - 记录所有证书访问和修改操作

4. **备份**
   - 定期备份证书文件
   - 将备份存储在安全位置

## 故障排除

### 证书加载失败

**问题**: 证书加载失败或找不到

**解决方案**:
1. 检查证书文件路径是否正确
2. 验证证书文件权限(600)
3. 确认证书格式正确
4. 查看日志获取详细错误信息

### 签名验证失败

**问题**: 支付回调签名验证失败

**解决方案**:
1. 确认公钥和私钥匹配
2. 检查证书是否过期
3. 验证证书序列号是否正确
4. 确认使用的证书与环境一致(开发/生产)

### Mock模式无法切换

**问题**: PAYMENT_MODE设置后仍然使用真实证书

**解决方案**:
1. 确认环境变量在服务启动前设置
2. 重启服务使配置生效
3. 检查.env文件中的配置是否正确
