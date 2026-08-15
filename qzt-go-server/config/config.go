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

// StorageConfig 文件存储配置。配置在 config.{env}.yaml，敏感字段通过 .env 注入。
// 双桶模型：公共桶(public-read,直链/CDN)+私有桶(private,签名 GET)。
//
// 存储驱动类型。
const (
	StorageDriverLocal = "local"
	StorageDriverOSS   = "oss"
)

type StorageConfig struct {
	// Driver 存储驱动：local（本地磁盘）或 oss（阿里云 OSS）。
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
	// MaxUploadMB 单文件上传大小上限（MB）。
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
