package model

// site_config.go 站点信息配置(sys_site_config)。
// 全局单条记录(id=1),后台「站点设置」页面管理。
// CMS 官网/admin后台/h5 都通过公开接口读取这些信息(logo/企业名/备案号等)。

// SysSiteConfig 站点信息配置。
type SysSiteConfig struct {
	ID uint `json:"id" gorm:"primaryKey"`

	// ── 品牌信息 ──
	// 站点名称(企业名)
	SiteName string `json:"site_name" gorm:"size:128;comment:站点名称(企业名)"`
	// Logo图片URL
	LogoURL string `json:"logo_url" gorm:"size:500;comment:Logo图片URL"`
	// 网站图标(浏览器标签页)URL
	FaviconURL string `json:"favicon_url" gorm:"size:500;comment:网站图标URL"`
	// 首页Hero小标签
	HeroBadge string `json:"hero_badge" gorm:"size:100;comment:首页Hero小标签"`
	// 首页Hero大标题
	HeroTitle string `json:"hero_title" gorm:"size:255;comment:首页Hero大标题"`
	// 首页Hero副标题
	HeroSubtitle string `json:"hero_subtitle" gorm:"size:500;comment:首页Hero副标题"`
	// 站点描述(SEO meta description)
	Description string `json:"description" gorm:"size:500;comment:站点描述(SEO meta description)"`

	// ── 首页展示(主题与营销区块,私有化部署可整体换肤/改写) ──
	// 前台主题包(如 dark-tech 深色科技 / light-clean 明亮企业,默认 dark-tech)
	Theme string `json:"theme" gorm:"size:50;comment:前台主题包(dark-tech/light-clean)"`
	// 首页数字带(JSON: [{num,label}],空数组/留空不渲染)
	StatsJSON string `json:"stats_json" gorm:"type:text;comment:首页数字带JSON"`
	// 首页模块墙(JSON: [{icon,name,desc,pills,big}],空数组/留空不渲染)
	ModulesJSON string `json:"modules_json" gorm:"type:text;comment:首页模块墙JSON"`
	// 首页底部CTA标题(留空回退中性文案)
	CtaTitle string `json:"cta_title" gorm:"size:255;comment:首页底部CTA标题"`
	// 首页底部CTA高亮词(渐变渲染,可空)
	CtaHighlight string `json:"cta_highlight" gorm:"size:100;comment:首页底部CTA高亮词"`
	// 首页底部CTA副标题
	CtaSubtitle string `json:"cta_subtitle" gorm:"size:500;comment:首页底部CTA副标题"`

	// ── 联系方式 ──
	// 联系电话
	ContactPhone string `json:"contact_phone" gorm:"size:50;comment:联系电话"`
	// 联系邮箱
	ContactEmail string `json:"contact_email" gorm:"size:128;comment:联系邮箱"`
	// 公司地址
	ContactAddress string `json:"contact_address" gorm:"size:500;comment:公司地址"`
	// 工作时间(如 周一至周五 9:00-18:00)
	WorkHours string `json:"work_hours" gorm:"size:100;comment:工作时间(如 周一至周五 9:00-18:00)"`

	// ── 备案信息 ──
	// ICP备案号(如 京ICP备xxxxxxxx号)
	ICPBeian string `json:"icp_beian" gorm:"size:100;comment:ICP备案号(如 京ICP备xxxxxxxx号)"`
	// 公安备案号
	PublicSecurityBeian string `json:"public_security_beian" gorm:"size:100;comment:公安备案号"`
	// 公安备案跳转链接
	PublicSecurityBeianURL string `json:"public_security_beian_url" gorm:"size:500;comment:公安备案跳转链接"`

	// ── SEO ──
	// SEO关键词(逗号分隔)
	Keywords string `json:"keywords" gorm:"size:500;comment:SEO关键词(逗号分隔)"`
	// 统计代码(GA/百度统计等JS)
	AnalyticsCode string `json:"analytics_code" gorm:"type:text;comment:统计代码(GA/百度统计等JS)"`

	// ── 其他 ──
	// 版权声明(如 © 2024 某某科技有限公司)
	Copyright string `json:"copyright" gorm:"size:255;comment:版权声明(如 © 2024 某某科技有限公司)"`
	// MCP服务地址(私有化部署填域名根+/mcp,供个人中心API Key页下发)
	McpURL string `json:"mcp_url" gorm:"size:500;comment:MCP服务地址"`

	BaseModel
}

func (SysSiteConfig) TableName() string { return "sys_site_config" }
