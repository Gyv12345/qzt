package model

// SysUser 系统用户。Password 用 json:"-" 避免序列化泄露；TokenVersion 用于让旧 token 失效。
type SysUser struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	Username     string    `json:"username" gorm:"uniqueIndex;size:64;not null"`
	Password     string    `json:"-" gorm:"size:128;not null"`
	Nickname     string    `json:"nickname" gorm:"size:64"`
	// 部门ID(关联hrm_department)
	DeptID       *uint     `json:"dept_id" gorm:"comment:部门ID(关联hrm_department)"`
	// 直属上级ID(关联sys_user,审批SUPERIOR用)
	LeaderID     *uint     `json:"leader_id" gorm:"comment:直属上级ID(关联sys_user,审批SUPERIOR用)"`
	Avatar       string    `json:"avatar" gorm:"size:255"`
	Email        string    `json:"email" gorm:"size:128"`
	Phone        string    `json:"phone" gorm:"size:20"`
	// 1-正常 0-禁用
	Status       int8      `json:"status" gorm:"default:1;comment:1-正常 0-禁用"`
	// 会话版本，自增使旧 token 失效
	TokenVersion int       `json:"-" gorm:"default:0;comment:会话版本，自增使旧 token 失效"`
	// 企业微信UserID
	WecomUserID  string    `json:"wecom_user_id" gorm:"size:64;index;comment:企业微信UserID"`
	// 微信服务号openid(通知推送+微信内免登录)
	WechatOpenID string    `json:"wechat_openid" gorm:"size:64;index;comment:微信服务号openid"`
	// 外部平台用户ID(钉钉 userid / 飞书 open_id;wecom 仍用 wecom_user_id 列,P32 通讯录同步)
	ExternalID string `json:"external_id" gorm:"size:64;index;default:'';comment:外部平台用户ID(钉钉userid/飞书open_id)"`
	// 外部来源平台(local/wecom/dingtalk/feishu)
	IDSource string `json:"id_source" gorm:"size:20;index;default:'';comment:来源(local/wecom/dingtalk/feishu)"`
	// 备注(通讯录同步自动创建时标「来自xx同步」)
	Remark string `json:"remark" gorm:"size:255;comment:备注"`
	Roles  []SysRole `json:"roles" gorm:"many2many:sys_user_role;"`
	BaseModel
}

func (SysUser) TableName() string {
	return "sys_user"
}

// 外部来源平台标识(id_source / sys_oauth_config.provider 通用口径)。
const (
	IDSourceLocal    = "local"
	IDSourceWecom    = "wecom"
	IDSourceDingtalk = "dingtalk"
	IDSourceFeishu   = "feishu"
)
