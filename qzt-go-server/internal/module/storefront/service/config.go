package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"qzt-go-server/config"
	"qzt-go-server/internal/pkg/setting"
	"qzt-go-server/internal/repository"
)

// config.go 跨境独立站站点配置(汇率 + 站点语言 + 通知邮箱)。
// 存 sys_config:storefront.rates(CNY per unit)、storefront.locales(站点语言)、
// storefront.notify_email(订单/询盘邮件通知收件人,P28-C)。
// 读:setting 缓存口径(公开接口读);写:ConfigRepo 直写 + 缓存刷新。

// ConfigService 独立站配置服务。
type ConfigService struct {
	configRepo *repository.ConfigRepo
}

// NewConfigService 构造。
func NewConfigService() *ConfigService {
	return &ConfigService{configRepo: repository.NewConfigRepo()}
}

// ── 配置键与默认值 ──

const (
	// keyRates 汇率(CNY per unit)
	keyRates = "storefront.rates"
	// keyLocales 站点语言
	keyLocales = "storefront.locales"
	// keyNotifyEmail 订单/询盘邮件通知收件人(逗号分隔,空=通道关闭)
	keyNotifyEmail = "storefront.notify_email"
)

// defaultRates 出厂默认汇率(CNY per unit)。
var defaultRates = map[string]float64{"USD": 7.2, "EUR": 7.8, "GBP": 8.8}

// defaultLocales 出厂默认语言(第一个=主语言)。
var defaultLocales = []string{"en", "zh"}

// PublicConfigDTO 公开站点配置(免鉴权可读)。
type PublicConfigDTO struct {
	// 站点语言(第一个=主语言)
	Locales []string `json:"locales"`
	// 汇率(CNY per unit)
	Rates map[string]float64 `json:"rates"`
	// PayPal 支付通道是否可用(凭据已配置,前端据此展示 PayPal 按钮)
	PayPalEnabled bool `json:"paypal_enabled"`
}

// load 读配置:sys_config 有值用值,否则出厂默认(不自动落库)。
func (s *ConfigService) load(ctx context.Context) (*PublicConfigDTO, error) {
	out := &PublicConfigDTO{
		Locales: append([]string(nil), defaultLocales...),
		Rates:   copyRates(defaultRates),
	}
	if row, err := s.configRepo.GetByKey(ctx, keyRates); err == nil && row != nil && row.Value != "" {
		var rates map[string]float64
		if json.Unmarshal([]byte(row.Value), &rates) == nil && len(rates) > 0 {
			out.Rates = rates
		}
	}
	if row, err := s.configRepo.GetByKey(ctx, keyLocales); err == nil && row != nil && row.Value != "" {
		var locales []string
		if json.Unmarshal([]byte(row.Value), &locales) == nil && len(locales) > 0 {
			out.Locales = locales
		}
	}
	pc := config.Get().Paypal
	out.PayPalEnabled = pc.ClientID != "" && pc.Secret != ""
	return out, nil
}

// copyRates 深拷贝汇率表。
func copyRates(src map[string]float64) map[string]float64 {
	dst := make(map[string]float64, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

// ── 管理端 ──

// AdminConfigDTO 管理端配置视图。
type AdminConfigDTO struct {
	Locales []string           `json:"locales"`
	Rates   map[string]float64 `json:"rates"`
	// 通知邮箱(订单/询盘邮件收件人,逗号分隔;空=邮件通道关闭)
	NotifyEmail string `json:"notify_email"`
}

// Public 返回公开站点配置(免鉴权;不含 notify_email 等管理端字段)。
func (s *ConfigService) Public(ctx context.Context) (*PublicConfigDTO, error) {
	return s.load(ctx)
}

// Get 返回管理端配置视图。
func (s *ConfigService) Get(ctx context.Context) (*AdminConfigDTO, error) {
	pub, err := s.load(ctx)
	if err != nil {
		return nil, err
	}
	out := &AdminConfigDTO{Locales: pub.Locales, Rates: pub.Rates}
	if row, err := s.configRepo.GetByKey(ctx, keyNotifyEmail); err == nil && row != nil {
		out.NotifyEmail = row.Value
	}
	return out, nil
}

// ConfigUpdateRequest 管理端配置更新请求(全量覆盖)。
type ConfigUpdateRequest struct {
	Locales []string           `json:"locales" binding:"required,min=1,max=8"`
	Rates   map[string]float64 `json:"rates"`
	// 通知邮箱(逗号/分号分隔;空串=清除,邮件通道关闭)
	NotifyEmail string `json:"notify_email" binding:"max=500"`
}

// Put 全量覆盖保存配置(刷新 setting 缓存)。
func (s *ConfigService) Put(ctx context.Context, req *ConfigUpdateRequest) error {
	// 通知邮箱校验:按逗号/分号拆分逐个过 emailRegexp,空串=清除(存空串)
	notify := ""
	if v := strings.TrimSpace(req.NotifyEmail); v != "" {
		parts := strings.FieldsFunc(v, func(r rune) bool { return r == ',' || r == ';' })
		cleaned := make([]string, 0, len(parts))
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p == "" {
				continue
			}
			if !emailRegexp.MatchString(p) {
				return fmt.Errorf("通知邮箱格式不正确: %s", p)
			}
			cleaned = append(cleaned, p)
		}
		if len(cleaned) == 0 {
			return fmt.Errorf("通知邮箱格式不正确: %s", v)
		}
		notify = strings.Join(cleaned, ",")
	}
	ratesJSON, _ := json.Marshal(req.Rates)
	localesJSON, _ := json.Marshal(req.Locales)
	for key, val := range map[string]string{
		keyRates:       string(ratesJSON),
		keyLocales:     string(localesJSON),
		keyNotifyEmail: notify,
	} {
		if err := s.configRepo.UpdateValue(ctx, key, val); err != nil {
			return err
		}
		setting.RefreshKey(ctx, key)
	}
	return nil
}
