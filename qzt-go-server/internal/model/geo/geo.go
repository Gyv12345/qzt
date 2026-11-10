package geo

import (
	"qzt-go-server/pkg/xtime"
)

// GeoPrompt 监测提示词库：一条「完整问题」（GEO 手册选题矩阵口径，非关键词）。
type GeoPrompt struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 完整监测问题，如「有哪些免费的CRM系统推荐？」
	Question string `json:"question" gorm:"size:255;not null;comment:完整监测问题"`
	// 分组：brand=品牌词(防御) category=品类通用词(进攻) scenario=延伸场景词(长尾)
	GroupType string `json:"group_type" gorm:"size:16;not null;default:category;comment:brand/category/scenario"`
	Enabled   bool   `json:"enabled" gorm:"not null;default:true;comment:是否参与监测"`
	Sort      int    `json:"sort" gorm:"not null;default:0;comment:排序值"`
	Remark    string `json:"remark" gorm:"size:255;comment:备注"`
	CreatedAt xtime.DateTime `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt xtime.DateTime `json:"updated_at" gorm:"autoUpdateTime"`
}

func (GeoPrompt) TableName() string {
	return "geo_prompt"
}

// GeoPlatform 被监测的 AI 平台（OpenAI 兼容 API）。
// 千问→DashScope 兼容模式、DeepSeek→官方 API、豆包→火山方舟；无公开 API 的平台
// （如元宝）暂无法接入，人工复测结果不进本表。
type GeoPlatform struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 平台名，如 DeepSeek / 通义千问
	Name    string `json:"name" gorm:"size:64;not null;comment:平台名"`
	BaseURL string `json:"base_url" gorm:"size:255;not null;comment:OpenAI兼容API根地址"`
	// API Key 只入库不外发；列表/详情接口只回 api_key_masked，编辑留空保留原值
	APIKey    string `json:"-" gorm:"size:255;not null;default:'';comment:平台APIKey(接口不回显)"`
	Model     string `json:"model" gorm:"size:64;not null;comment:模型名"`
	Enabled   bool   `json:"enabled" gorm:"not null;default:true;comment:是否参与监测"`
	Remark    string `json:"remark" gorm:"size:255;comment:备注"`
	CreatedAt xtime.DateTime `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt xtime.DateTime `json:"updated_at" gorm:"autoUpdateTime"`
}

// APIKeySet 是否已配置 Key（handler 计算后随 JSON 返回）。
func (p GeoPlatform) APIKeySet() bool { return p.APIKey != "" }

// MaskedKey 掩码形态（前 4 后 4），仅用于管理界面确认「配的是哪把钥匙」。
func (p GeoPlatform) MaskedKey() string {
	if len(p.APIKey) <= 8 {
		return "已配置"
	}
	return p.APIKey[:4] + "****" + p.APIKey[len(p.APIKey)-4:]
}

func (GeoPlatform) TableName() string {
	return "geo_platform"
}

// GeoRun 一轮监测（触发一次 = 启用提示词 × 启用平台的全组合）。
type GeoRun struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// manual=界面手动触发 schedule=定时任务
	Trigger string `json:"trigger" gorm:"size:16;not null;default:manual;comment:manual/schedule"`
	// running=执行中 done=完成 failed=全部失败
	Status string `json:"status" gorm:"size:16;not null;default:running;comment:running/done/failed"`
	// 实际发起的结果条数（含失败）
	TotalResults int `json:"total_results" gorm:"not null;default:0;comment:结果条数(含失败)"`
	ErrorCount    int `json:"error_count" gorm:"not null;default:0;comment:失败条数"`
	MentionedCount int `json:"mentioned_count" gorm:"not null;default:0;comment:提及行简条数"`
	WithLinkCount  int `json:"with_link_count" gorm:"not null;default:0;comment:提及且带官网链接条数"`
	// TotalScore/MaxScore：手册口径得分合计 / 满分(提示词×平台×2)
	TotalScore int `json:"total_score" gorm:"not null;default:0;comment:得分合计"`
	MaxScore   int `json:"max_score" gorm:"not null;default:0;comment:满分"`
	// RecommendRate AI 推荐率 = 得分合计/满分；OwnCiteRate 自有引用命中率 = 自有域引用数/含引用条数
	RecommendRate float64 `json:"recommend_rate" gorm:"not null;default:0;comment:AI推荐率(0-1)"`
	OwnCiteRate   float64 `json:"own_cite_rate" gorm:"not null;default:0;comment:自有引用命中率(0-1)"`
	ErrorMsg   string          `json:"error_msg" gorm:"size:500;comment:失败原因摘要"`
	StartedAt  xtime.DateTime  `json:"started_at" gorm:"autoCreateTime"`
	FinishedAt *xtime.DateTime `json:"finished_at" gorm:"comment:完成时间"`
}

func (GeoRun) TableName() string {
	return "geo_run"
}

// GeoResult 单条监测结果（轮次 × 提示词 × 平台）。
type GeoResult struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	RunID      uint   `json:"run_id" gorm:"not null;comment:轮次ID"`
	PromptID   uint   `json:"prompt_id" gorm:"not null;comment:提示词ID"`
	PlatformID uint   `json:"platform_id" gorm:"not null;comment:平台ID"`
	// 0=未提及 1=提及行简 2=提及且带官网链接（手册三级打分）
	Score        int  `json:"score" gorm:"not null;default:0;comment:0未提及/1提及行简/2提及且带官网链接"`
	MentionBrand bool `json:"mention_brand" gorm:"not null;default:false;comment:是否提及行简"`
	HasOwnLink   bool `json:"has_own_link" gorm:"not null;default:false;comment:回答是否含官网链接"`
	// 引用中是否命中自有渠道域名（devlovecode.com 及其子域）
	OwnCite bool `json:"own_cite" gorm:"not null;default:false;comment:引用是否命中自有域名"`
	// 回答中提取到的引用 URL（JSON 数组）
	CitedURLs   string `json:"cited_urls" gorm:"type:text;comment:引用URL(JSON数组)"`
	Competitors string `json:"competitors" gorm:"size:255;comment:命中的竞品名(逗号分隔)"`
	LatencyMs   int64  `json:"latency_ms" gorm:"not null;default:0;comment:调用耗时(毫秒)"`
	Status      string `json:"status" gorm:"size:16;not null;default:ok;comment:ok/error"`
	ErrorMsg    string `json:"error_msg" gorm:"size:500;comment:失败原因摘要"`
	// 模型回答全文（监测证据，供人工复核打分）
	Answer    string         `json:"answer" gorm:"type:mediumtext;comment:回答全文"`
	CreatedAt xtime.DateTime `json:"created_at" gorm:"autoCreateTime"`
}

func (GeoResult) TableName() string {
	return "geo_result"
}

// GeoTopic 选题池：一条待产稿的选题（手册矩阵/AI 从监测结果生成/手工录入）。
type GeoTopic struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 选题问题（完整问句，写稿的输入）
	Question string `json:"question" gorm:"size:255;not null;comment:选题问题"`
	// matrix=手册矩阵 ai=AI生成 manual=手工录入
	Origin string `json:"origin" gorm:"size:16;not null;default:ai;comment:matrix/ai/manual"`
	// pending=待审批 approved=已批准待产稿 rejected=已驳回 used=已产稿
	Status string `json:"status" gorm:"size:16;not null;default:pending;comment:pending/approved/rejected/used"`
	// 选题依据（监测低分/竞品提及/引用缺口），AI 生成时必填
	Reason string `json:"reason" gorm:"size:500;comment:选题依据"`
	// 来源监测轮次（0=与监测无关）
	SourceRunID uint `json:"source_run_id" gorm:"not null;default:0;comment:来源监测轮次ID"`
	// 关联既有提示词（0=新题；AI 追问类选题常指向矩阵原题）
	PromptID  uint           `json:"prompt_id" gorm:"not null;default:0;comment:关联提示词ID"`
	CreatedAt xtime.DateTime `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt xtime.DateTime `json:"updated_at" gorm:"autoUpdateTime"`
}

func (GeoTopic) TableName() string {
	return "geo_topic"
}

// GeoSource 稿件库：图文/视频/脚本统一存稿，多平台改写经 VariantOf 挂母稿。
type GeoSource struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 选题 ID（0=手工稿，无选题来源）
	TopicID uint `json:"topic_id" gorm:"not null;default:0;comment:选题ID"`
	// article=图文 video=成片 video_script=口播脚本
	ContentType string `json:"content_type" gorm:"size:16;not null;default:article;comment:article/video/video_script"`
	// wechat_mp/douyin/xhs/zhihu/csdn/toutiao
	Platform string `json:"platform" gorm:"size:32;not null;default:wechat_mp;comment:目标平台"`
	// comparison=对比评测 faq=科普解答 case=案例拆解（手册第三节体裁）
	Genre string `json:"genre" gorm:"size:16;not null;default:'';comment:comparison/faq/case"`
	Title    string `json:"title" gorm:"size:128;not null;default:'';comment:标题"`
	Digest   string `json:"digest" gorm:"size:256;not null;default:'';comment:摘要"`
	ContentMd string `json:"content_md" gorm:"type:mediumtext;comment:正文Markdown"`
	// 视频稿专用：成片地址（OSS/CDN）与生成任务号
	VideoURL    string `json:"video_url" gorm:"size:512;not null;default:'';comment:视频地址"`
	VideoTaskID string `json:"video_task_id" gorm:"size:128;not null;default:'';comment:视频生成任务号"`
	// generated=已生成待推送 pushed=已推草稿箱 published=已发布 failed=失败 skipped=跳过
	Status string `json:"status" gorm:"size:16;not null;default:generated;comment:generated/pushed/published/failed/skipped"`
	// 公众号草稿 media_id / freepublish 发布任务号 / 发布 URL
	MediaID    string `json:"media_id" gorm:"size:128;not null;default:'';comment:公众号草稿media_id"`
	PublishID  string `json:"publish_id" gorm:"size:128;not null;default:'';comment:发布任务ID"`
	PublishURL string `json:"publish_url" gorm:"size:512;not null;default:'';comment:发布URL"`
	// 母稿 ID（0=母稿；多平台分发稿指向原稿）
	VariantOf uint `json:"variant_of" gorm:"not null;default:0;comment:母稿ID"`
	// manual=界面手动 schedule=定时任务
	Trigger   string         `json:"trigger" gorm:"size:16;not null;default:manual;comment:manual/schedule"`
	Error     string         `json:"error" gorm:"size:500;comment:失败原因摘要"`
	// AI 质检状态（P18 门禁）：none=未质检 pass=通过 warn=通过但有修改建议 blocked=阻断（不进推送队列）
	QcStatus string `json:"qc_status" gorm:"size:16;not null;default:none;comment:none/pass/warn/blocked"`
	// AI 质检结果 JSON（分维度得分/原文定位/修改建议/checked_at/model），qc_status=none 时为空
	QcResult string `json:"qc_result" gorm:"type:json;comment:质检结果JSON"`
	CreatedAt xtime.DateTime `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt xtime.DateTime `json:"updated_at" gorm:"autoUpdateTime"`
}

func (GeoSource) TableName() string {
	return "geo_source"
}

// GeoPlatformAccount 信源分发平台授权账号（抖音开放平台 OAuth）。
// access/refresh token 只入库不外发；列表接口只回掩码信息。
type GeoPlatformAccount struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// douyin（后续可扩视频号/小红书等有开放平台直发的平台）
	Platform string `json:"platform" gorm:"size:32;not null;comment:douyin"`
	OpenID   string `json:"open_id" gorm:"size:128;not null;comment:平台openid"`
	Nickname string `json:"nickname" gorm:"size:128;not null;default:'';comment:账号昵称"`
	AccessToken  string         `json:"-" gorm:"size:1024;not null;default:'';comment:访问令牌(接口不回显)"`
	RefreshToken string         `json:"-" gorm:"size:1024;not null;default:'';comment:刷新令牌(接口不回显)"`
	ExpiresAt    xtime.DateTime `json:"expires_at" gorm:"not null;comment:令牌过期时间"`
	Scope    string         `json:"scope" gorm:"size:255;not null;default:'';comment:授权scope"`
	Enabled  bool           `json:"enabled" gorm:"not null;default:true;comment:是否可用"`
	CreatedAt xtime.DateTime `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt xtime.DateTime `json:"updated_at" gorm:"autoUpdateTime"`
}

func (GeoPlatformAccount) TableName() string {
	return "geo_platform_account"
}
