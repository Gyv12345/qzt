package cms

import "qzt-go-server/pkg/xtime"

// track.go CMS 官网埋点事件。官网前台访客行为上报,append-only 日志表:
// 不需要软删除/更新,不继承 base.BaseModel,仅保留上报时间。

// 常用事件名(前端埋点点位,仅作文档约定,服务端不强制枚举)。
const (
	TrackEventPageview      = "pageview"       // 页面浏览
	TrackEventContactSubmit = "contact_submit" // 官网留言提交成功
	TrackEventClickContact  = "click_contact"  // 点击联系我们入口
	TrackEventClickDemo     = "click_demo"     // 点击在线体验入口
	TrackEventClickProduct  = "click_product"  // 点击产品
	TrackEventClickArticle  = "click_article"  // 点击文章
)

// CmsTrackEvent 官网埋点事件。
type CmsTrackEvent struct {
	ID     uint   `json:"id" gorm:"primaryKey"`
	// 事件名
	Event     string         `json:"event" gorm:"size:64;not null;index;comment:事件名"`
	// 页面路径
	Path      string         `json:"path" gorm:"size:255;index;comment:页面路径"`
	// 页面标题
	Title     string         `json:"title" gorm:"size:255;comment:页面标题"`
	// 来源页
	Referrer  string         `json:"referrer" gorm:"size:500;comment:来源页"`
	// 匿名访客ID(前端 localStorage 生成,不含任何个人身份信息)
	VisitorID string         `json:"visitor_id" gorm:"size:64;index;comment:匿名访客ID"`
	// 会话ID(前端 sessionStorage 生成)
	SessionID string         `json:"session_id" gorm:"size:64;comment:会话ID"`
	// 扩展属性(JSON,如产品ID/按钮文案);nil 落库为 NULL(json 列不接受空串)
	Props *string `json:"props" gorm:"type:json;comment:扩展属性JSON"`
	// 上报IP
	IP        string         `json:"ip" gorm:"size:64;index;comment:上报IP"`
	// User-Agent
	UA        string         `json:"ua" gorm:"size:255;comment:User-Agent"`
	// 上报时间
	CreatedAt xtime.DateTime `json:"created_at" gorm:"index;autoCreateTime"`
}

func (CmsTrackEvent) TableName() string { return "cms_track_event" }
