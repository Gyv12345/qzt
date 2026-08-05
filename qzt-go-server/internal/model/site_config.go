package model

// site_config.go 站点信息配置(sys_site_config)。
// 全局单条记录(id=1),后台「站点设置」页面管理。
// CMS 官网/admin后台/h5 都通过公开接口读取这些信息(logo/企业名/备案号等)。

// SysSiteConfig 站点信息配置。
type SysSiteConfig struct {
	ID uint `json:"id" gorm:"primaryKey"`

	// ── 品牌信息 ──
	SiteName    string `json:"site_name" gorm:"size:128;comment:站点名称(企业名)"`
	LogoURL     string `json:"logo_url" gorm:"size:500;comment:Logo图片URL"`
	FaviconURL  string `json:"favicon_url" gorm:"size:500;comment:Favicon图标URL"`
	Slogan      string `json:"slogan" gorm:"size:255;comment:品牌标语/Slogan"`
	HeroBadge   string `json:"hero_badge" gorm:"size:100;comment:首页Hero小标签"`
	HeroTitle   string `json:"hero_title" gorm:"size:255;comment:首页Hero大标题"`
	HeroSubtitle string `json:"hero_subtitle" gorm:"size:500;comment:首页Hero副标题"`
	Description string `json:"description" gorm:"size:500;comment:站点描述(SEO meta description)"`

	// ── 联系方式 ──
	ContactPhone   string `json:"contact_phone" gorm:"size:50;comment:联系电话"`
	ContactEmail   string `json:"contact_email" gorm:"size:128;comment:联系邮箱"`
	ContactAddress string `json:"contact_address" gorm:"size:500;comment:公司地址"`
	ContactQQ      string `json:"contact_qq" gorm:"size:20;comment:客服QQ"`
	ContactWechat  string `json:"contact_wechat" gorm:"size:128;comment:微信号/客服二维码URL"`
	WorkHours      string `json:"work_hours" gorm:"size:100;comment:工作时间(如 周一至周五 9:00-18:00)"`

	// ── 社交媒体 ──
	WeiboURL   string `json:"weibo_url" gorm:"size:500;comment:微博链接"`
	WechatQrURL string `json:"wechat_qr_url" gorm:"size:500;comment:微信公众号二维码URL"`
	LinkedInURL string `json:"linkedin_url" gorm:"size:500;comment:LinkedIn链接"`

	// ── 备案信息 ──
	ICPBeian    string `json:"icp_beian" gorm:"size:100;comment:ICP备案号(如 京ICP备xxxxxxxx号)"`
	PublicSecurityBeian string `json:"public_security_beian" gorm:"size:100;comment:公安备案号"`
	PublicSecurityBeianURL string `json:"public_security_beian_url" gorm:"size:500;comment:公安备案跳转链接"`

	// ── SEO ──
	Keywords string `json:"keywords" gorm:"size:500;comment:SEO关键词(逗号分隔)"`
	AnalyticsCode string `json:"analytics_code" gorm:"type:text;comment:统计代码(GA/百度统计等JS)"`

	// ── 其他 ──
	Copyright string `json:"copyright" gorm:"size:255;comment:版权声明(如 © 2024 某某科技有限公司)"`

	BaseModel
}

func (SysSiteConfig) TableName() string { return "sys_site_config" }
