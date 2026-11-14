package config

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"time"

	"github.com/spf13/viper"

	"qzt-go-server/pkg/xenv"
)

// 配置原子存储与文件路径映射。
var (
	configAtomic atomic.Value

	configFilePathMap = map[string]string{
		xenv.ProdConstant: "config.prod",
		xenv.UatConstant:  "config.uat",
		xenv.DevConstant:  "config.dev",
	}

	initFlag          uint32
	defaultConfigPath = "./config"
)

// Config 全局配置结构体，与 config.{env}.yaml 一一对应。
type Config struct {
	Application ApplicationConfig `mapstructure:"application"`
	Log         LogConfig         `mapstructure:"log"`
	MySQL       MysqlConfig       `mapstructure:"mysql"`
	Redis       RedisConfig       `mapstructure:"redis"`
	JWT         JwtConfig         `mapstructure:"jwt"`
	Storage     StorageConfig     `mapstructure:"storage"`
	Cors        CorsConfig        `mapstructure:"cors"`
	LLM         LLMConfig         `mapstructure:"llm"`
	VideoGen    VideoGenConfig    `mapstructure:"videogen"`
	Geo         GeoConfig         `mapstructure:"geo"`
	SEO         SEOConfig         `mapstructure:"seo"`
	Stripe      StripeConfig      `mapstructure:"stripe"`
	Paypal      PaypalConfig      `mapstructure:"paypal"`
	Email       EmailConfig       `mapstructure:"email"`
}

// PaypalConfig PayPal 支付网关(internal/pkg/paypal,P28-C 独立站第二支付通道)配置。
// client_id/secret 只走 gitignored .env 注入(PAYPAL_CLIENT_ID / PAYPAL_SECRET),
// 留空=未配置——PayPal 下单返回「PayPal 支付未配置」,不影响 Stripe 通道。
type PaypalConfig struct {
	// Env sandbox / live(默认 sandbox,影响 API 根地址)。
	Env string `mapstructure:"env"`
	// ClientID 应用 Client ID,只进 .env。
	ClientID string `mapstructure:"client_id"`
	// Secret 应用 Secret,只进 .env。
	Secret string `mapstructure:"secret"`
	// StorefrontSiteURL 独立站站点根地址,拼 PayPal 审批回跳地址
	// ({site}/{locale}/checkout/success 等)。
	StorefrontSiteURL string `mapstructure:"storefront_site_url"`
}

// EmailConfig 事务邮件 SMTP(internal/pkg/emailer,P28-C 独立站订单/询盘通知)配置。
// 全部字段只走 gitignored .env 注入(EMAIL_SMTP_*),留空=邮件通道关闭,
// 通知走站内信/企微兜底,邮件只是补充渠道。
type EmailConfig struct {
	// Host SMTP 服务器,空=通道关闭。
	Host string `mapstructure:"host"`
	// Port 端口(465=隐式 TLS;587 等走 STARTTLS,默认 465)。
	Port int `mapstructure:"port"`
	// Username 发信账号。
	Username string `mapstructure:"username"`
	// Password 授权码/密码。
	Password string `mapstructure:"password"`
	// From 发件人地址,空则用 Username。
	From string `mapstructure:"from"`
}

// StripeConfig Stripe 支付网关(internal/pkg/stripe,P28-B 独立站支付闭环)配置。
// secret_key / webhook_secret 只走 gitignored .env 注入(STRIPE_SECRET_KEY /
// STRIPE_WEBHOOK_SECRET),留空表示未配置——checkout 会返回明确错误
// 「支付通道未配置」,webhook 一律验签失败,不影响其余功能。
type StripeConfig struct {
	// SecretKey 密钥(sk_test_... / sk_live_...),只进 .env。
	SecretKey string `mapstructure:"secret_key"`
	// WebhookSecret 签名密钥(whsec_...),只进 .env,用于 webhook 验签。
	WebhookSecret string `mapstructure:"webhook_secret"`
	// StorefrontSiteURL 独立站站点根地址,拼接 Stripe 成功/取消跳转
	// ({site}/{locale}/checkout/success 等)。
	StorefrontSiteURL string `mapstructure:"storefront_site_url"`
}

// SEOConfig 搜索引擎主动推送(internal/pkg/searchpush + cms 模块)配置。
// baidu_token / indexnow_key 只走 gitignored .env 注入
// (GEO_BAIDU_TOKEN / SEO_INDEXNOW_KEY),留空即对应通道禁用。
type SEOConfig struct {
	// Site 站点根地址,如 https://devlovecode.com。既是推送 URL 的拼接前缀,
	// 也是域名白名单——白名单外的 URL 一律不推。
	Site string `mapstructure:"site"`
	// BaiduToken 百度搜索资源平台 API 推送 token(.env GEO_BAIDU_TOKEN)。
	BaiduToken string `mapstructure:"baidu_token"`
	// IndexNowKey IndexNow 密钥,须与站点 https://<site>/<key>.txt 内容一致(.env SEO_INDEXNOW_KEY)。
	IndexNowKey string `mapstructure:"indexnow_key"`
	// DailyQuota 每日兜底任务推给百度的最大条数(与百度每日配额对齐,默认 10)。
	DailyQuota int `mapstructure:"daily_quota"`
}

// GeoConfig GEO 信源产线开关（internal/module/geo）。
type GeoConfig struct {
	// AutoPush 定时产稿后自动推送公众号草稿箱（草稿不公开可删；群发仍在 mp 后台人工确认）。
	AutoPush bool `mapstructure:"auto_push"`
	// TopicAutoApprove AI 生成的选题是否免审批直接进入产稿队列（默认 false=人工审批）。
	TopicAutoApprove bool `mapstructure:"topic_auto_approve"`
}

// VideoGenConfig AI 文生视频网关（internal/pkg/videogen）配置。
// api_key 只走 gitignored .env 注入（VIDEOGEN_API_KEY），留空表示未配置——
// GEO 信源产线的视频步自动跳过，不阻塞图文。
type VideoGenConfig struct {
	// Provider 供应商：ark=火山方舟即梦 Seedance（默认，也是当前唯一实现）。
	Provider string `mapstructure:"provider"`
	// BaseURL API 根地址（ark 默认 https://ark.cn-beijing.volces.com/api/v3）。
	BaseURL string `mapstructure:"base_url"`
	// APIKey 供应商密钥，只进 .env。
	APIKey string `mapstructure:"api_key"`
	// Model 模型名，如 doubao-seedance-1-0-lite-t2v-250428。
	Model string `mapstructure:"model"`
	// Resolution 分辨率 480p/720p/1080p（默认 720p；1080p 体积大注意上传上限）。
	Resolution string `mapstructure:"resolution"`
	// DurationSeconds 单条时长秒数（Seedance 支持 5/10，默认 5）。
	DurationSeconds int `mapstructure:"duration_seconds"`
	// Ratio 画幅（16:9/9:16/1:1，默认 16:9；抖音竖屏用 9:16）。
	Ratio string `mapstructure:"ratio"`
}

// LLMConfig 统一 LLM 网关（internal/pkg/llm）配置，OpenAI chat completions 兼容协议。
// api_key 只走 gitignored .env 注入（LLM_API_KEY），留空表示未配置——
// llm.Chat 会返回明确错误，各 AI 功能可用 llm.Enabled() 预判走降级路径。
type LLMConfig struct {
	// BaseURL OpenAI 兼容 API 根地址，如 https://api.deepseek.com（DeepSeek）或
	// https://dashscope.aliyuncs.com/compatible-mode/v1（通义兼容模式）。
	BaseURL string `mapstructure:"base_url"`
	// APIKey 供应商密钥，只进 .env。
	APIKey string `mapstructure:"api_key"`
	// Model 默认模型，如 deepseek-chat / qwen-plus。
	Model string `mapstructure:"model"`
	// Timeout 单次 HTTP 调用超时。
	Timeout time.Duration `mapstructure:"timeout"`
	// MaxRetries 429/5xx/网络错误的最大重试次数。
	MaxRetries int `mapstructure:"max_retries"`
	// RPM 进程级每分钟最大请求数（令牌桶），0 不限流。
	RPM int `mapstructure:"rpm"`
	// CacheTTL 相同请求的响应缓存 TTL，0 关闭。
	CacheTTL time.Duration `mapstructure:"cache_ttl"`
	// Embedding 向量嵌入配置节（P17 知识库 RAG）。embedding 供应商常与 chat 不同家，
	// 独立 base_url/api_key/model；APIKey 留空表示未配置，RAG 功能走降级路径。
	Embedding EmbeddingConfig `mapstructure:"embedding"`
}

// EmbeddingConfig 向量嵌入（OpenAI 兼容 /embeddings）配置。
// 与 chat 配置解耦：换 embedding 供应商只改本节，不影响 Chat。
type EmbeddingConfig struct {
	// BaseURL OpenAI 兼容根地址（固定拼 /embeddings），如
	// https://dashscope.aliyuncs.com/compatible-mode/v1（通义兼容模式）。
	BaseURL string `mapstructure:"base_url"`
	// APIKey 供应商密钥，只进 .env（KB_EMBEDDING_API_KEY）。
	APIKey string `mapstructure:"api_key"`
	// Model 嵌入模型名，如 text-embedding-v3（通义）/ BAAI/bge-m3（硅基流动）。
	Model string `mapstructure:"model"`
	// Timeout 单次 HTTP 调用超时。
	Timeout time.Duration `mapstructure:"timeout"`
	// MaxRetries 429/5xx/网络错误的最大重试次数。
	MaxRetries int `mapstructure:"max_retries"`
}

// CorsConfig 跨域配置。AllowOrigins 为空时保持反射任意 Origin(兼容既有
// 私有化部署,Bearer 模式下无直接可利用面);配置后仅白名单内 Origin 可
// 携带凭证跨域——支持 ${VAR} 注入,域名不同的客户环境走环境变量。
type CorsConfig struct {
	AllowOrigins []string `mapstructure:"allow_origins"`
}

// ApplicationConfig 应用基础配置。
type ApplicationConfig struct {
	// EnableAccessLog 是否记录访问日志文件。
	EnableAccessLog bool `mapstructure:"enable_access_log"`
	// EnablePprof 是否注册 pprof 路由。
	EnablePprof bool `mapstructure:"enable_pprof"`
	Server      ServerConfig `mapstructure:"server"`
}

// ServerConfig HTTP 服务配置。
type ServerConfig struct {
	Name         string        `mapstructure:"name"`
	Version      string        `mapstructure:"version"`
	Addr         string        `mapstructure:"addr"`
	Port         uint32        `mapstructure:"port"`
	ReadTimeout  time.Duration `mapstructure:"read_timeout"`
	WriteTimeout time.Duration `mapstructure:"write_timeout"`
	MaxHeaderMB  int           `mapstructure:"max_header_mb"`
}

// LogConfig 日志配置。
type LogConfig struct {
	// Output 输出方式：console / file / multi。
	Output string `mapstructure:"output"`
	// AccessEncoder 访问日志编码：normal / json。
	AccessEncoder string `mapstructure:"access_encoder"`
	// LogEncoder 业务日志编码：normal / json。
	LogEncoder string `mapstructure:"log_encoder"`
	// AccessFileMaxAgeDays 访问日志文件保留天数。
	AccessFileMaxAgeDays uint32 `mapstructure:"access_file_max_age_days"`
	// LogFileMaxAgeDays 业务日志文件保留天数。
	LogFileMaxAgeDays uint32 `mapstructure:"log_file_max_age_days"`
}

// RedisConfig Redis 配置。
type RedisConfig struct {
	Addr         string        `mapstructure:"addr"`
	Password     string        `mapstructure:"password"`
	DB           int           `mapstructure:"db"`
	DialTimeout  time.Duration `mapstructure:"dial_timeout"`
	ReadTimeout  time.Duration `mapstructure:"read_timeout"`
	WriteTimeout time.Duration `mapstructure:"write_timeout"`
	IdleTimeout  time.Duration `mapstructure:"idle_timeout"`
	MinIdleConns int           `mapstructure:"min_idle_conns"`
	PoolSize     int           `mapstructure:"pool_size"`
}

// MysqlConfig MySQL 配置。
type MysqlConfig struct {
	// EnableReadWriteSeparation 是否启用 dbresolver 读写分离（需配置 mains/slaves）。
	EnableReadWriteSeparation bool `mapstructure:"enable_read_write_separation"`
	// DSN 主库连接串。
	DSN string `mapstructure:"dsn"`
	// MainsDSN 主库 DSN 列表（读写分离时使用）。
	MainsDSN []string `mapstructure:"mains_dsn"`
	// SlavesDSN 从库 DSN 列表（读写分离时使用）。
	SlavesDSN []string `mapstructure:"slaves_dsn"`
	// MaxIdleConns 最大空闲连接数。
	MaxIdleConns int `mapstructure:"max_idle_conns"`
	// MaxOpenConns 最大打开连接数。
	MaxOpenConns int `mapstructure:"max_open_conns"`
	// ConnMaxIdleTime 连接最大空闲时间。
	ConnMaxIdleTime time.Duration `mapstructure:"conn_max_idle_time"`
	// ConnMaxLifeTime 连接最大生命周期。
	ConnMaxLifeTime time.Duration `mapstructure:"conn_max_life_time"`
	// EnableSqlLog 是否打印 SQL。
	EnableSqlLog bool `mapstructure:"enable_sql_log"`
	// SlowSqlThresholdTime 慢 SQL 阈值。
	SlowSqlThresholdTime time.Duration `mapstructure:"slow_sql_threshold_time"`
}

// JwtConfig JWT 配置。
type JwtConfig struct {
	Issuer                string        `mapstructure:"issuer"`
	JwtSecret             string        `mapstructure:"jwt_secret"`
	AccessExpirationTime  time.Duration `mapstructure:"access_expiration_time"`
	RefreshExpirationTime time.Duration `mapstructure:"refresh_expiration_time"`
}

// StorageConfig 文件存储配置。
// v2 起 sys_storage_config(DB)是唯一生效配置源(单条 is_active=1,后台可配可热切换);
// 本节仅作两用:① 首次启动 DB 表为空时自动播种一条生效配置(密钥随 yaml 读入 DB);
// ② DB 无生效行时的运行兜底。改存储配置请走后台「系统管理-文件存储」页。
// 敏感字段通过 .env 注入。双桶模型：公共桶(public-read,直链/CDN)+私有桶(private,签名 GET)。
//
// 存储驱动类型。
const (
	StorageDriverLocal = "local"
	StorageDriverOSS   = "oss"
)

type StorageConfig struct {
	// Driver 存储驱动：local（本地磁盘）或 oss（阿里云 OSS）。仅作首次播种来源。
	Driver string `mapstructure:"driver"`
	// LocalPath 公共存储根目录（driver=local 时使用，nginx 静态 serve）。
	LocalPath string `mapstructure:"local_path"`
	// PrivatePath 私有存储根目录（driver=local 时使用，后端代理鉴权访问，nginx 不直接 serve）。
	PrivatePath string `mapstructure:"private_path"`
	// ResourceDomain 资源访问域名（本地存储公共目录拼接文件可访问 URL）。
	ResourceDomain string `mapstructure:"resource_domain"`
	// DownloadPrefix 私有文件代理下载 URL 前缀（driver=local 时使用）。
	// 默认 /api/file/dl(直连后端);前端通过 /prod-api 反代时应填 /prod-api/api/file/dl。
	DownloadPrefix string `mapstructure:"download_prefix"`
	// MaxUploadMB 单文件上传大小上限（MB）。DB 无生效行时的兜底上限。
	MaxUploadMB int `mapstructure:"max_upload_mb"`
	// OSS 阿里云 OSS 配置（driver=oss 时使用）。
	OSS OSSConfig `mapstructure:"oss"`
}

// OSSConfig 阿里云 OSS 对象存储配置。敏感字段通过 .env 注入。
// 公共桶与私有桶共用同一组 Endpoint/AK/SK（绝大多数阿里云账号如此）。
type OSSConfig struct {
	// Endpoint OSS 访问域名，如 oss-cn-hangzhou.aliyuncs.com。
	Endpoint string `mapstructure:"endpoint"`
	// AccessKeyID 阿里云 AccessKey ID。
	AccessKeyID string `mapstructure:"access_key_id"`
	// AccessKeySecret 阿里云 AccessKey Secret。
	AccessKeySecret string `mapstructure:"access_key_secret"`
	// BucketName 公共桶名称（public-read，挂 CDN 直链访问）。
	BucketName string `mapstructure:"bucket_name"`
	// CustomDomain 公共桶 CDN/自定义域名（拼接文件 URL，空则用默认 https://{bucket}.{endpoint}/{key}）。
	CustomDomain string `mapstructure:"custom_domain"`
	// PrivateBucketName 私有桶名称（private，签名 GET 访问）。留空则私有附件功能禁用。
	PrivateBucketName string `mapstructure:"private_bucket_name"`
	// PrivateCustomDomain 私有桶自定义域名（一般留空，签名 URL 直接走 OSS 源站）。
	PrivateCustomDomain string `mapstructure:"private_custom_domain"`
}

// Get 获取当前配置（线程安全）。必须在 Init 之后调用，否则 panic。
func Get() Config {
	if cfg := configAtomic.Load(); cfg != nil {
		if c, ok := cfg.(Config); ok {
			return c
		}
	}
	panic("config: Get() called before Init()")
}

// Init 初始化配置，自动根据 ENV 加载对应文件。仅可调用一次。
func Init(configPath string) {
	if !atomic.CompareAndSwapUint32(&initFlag, 0, 1) {
		panic("config: already initialized")
	}

	env := xenv.Env()
	configName, ok := configFilePathMap[env]
	if !ok {
		panic(fmt.Sprintf("config: unknown environment %q", env))
	}

	v := initViper(configName, configPath)

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		panic(fmt.Sprintf("config: failed to unmarshal config: %v", err))
	}
	configAtomic.Store(cfg)
}

// initViper 初始化 Viper 实例，读取配置文件并展开 ${VAR} / ${VAR:-default} 占位符。
func initViper(configName, configPath string) *viper.Viper {
	if len(configPath) == 0 {
		configPath = defaultConfigPath
	}

	// #nosec G304 — 配置文件名由内部映射表决定，非用户可控输入
	raw, err := os.ReadFile(filepath.Join(configPath, configName+".yaml"))
	if err != nil {
		panic(fmt.Sprintf("config: failed to read config file %q: %v", configName+".yaml", err))
	}

	v := viper.New()
	v.SetConfigType("yaml")
	if err := v.ReadConfig(bytes.NewReader([]byte(expandEnv(string(raw))))); err != nil {
		panic(fmt.Sprintf("config: failed to parse config: %v", err))
	}
	return v
}

// expandEnv 展开字符串中的 ${VAR} 和 ${VAR:-default}，
// 让生产环境通过环境变量注入敏感配置，而开发环境直接写在 YAML 中。
func expandEnv(s string) string {
	return os.Expand(s, func(key string) string {
		if i := strings.Index(key, ":-"); i >= 0 {
			if v, ok := os.LookupEnv(key[:i]); ok {
				return v
			}
			return key[i+2:] // 返回默认值
		}
		return os.Getenv(key)
	})
}
