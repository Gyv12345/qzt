package model

// attachment.go 通用附件表(多态: biz_type + resource_id 关联任意业务实体)。
// 所有业务详情页的「附件」Tab 共用此表,通过 biz_type 区分归属。
// 与 change_log 同构,照其多态约定。

// SysAttachment 通用附件记录。
// 公共文件: URL 为明文直链 URL(走 CDN);
// 私有文件: URL 为 objectKey,前端需调 /api/file/sign 取短期签名下载 URL。
type SysAttachment struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	// 业务类型(CUSTOMER/CONTRACT/OPPORTUNITY/EMPLOYEE/...)
	BizType     string `json:"biz_type" gorm:"size:32;index:idx_attach_biz;not null;comment:业务类型(CUSTOMER/CONTRACT/OPPORTUNITY/EMPLOYEE/...)"`
	// 资源ID
	ResourceID  uint   `json:"resource_id" gorm:"index:idx_attach_biz;not null;comment:资源ID"`
	// 原始文件名
	FileName    string `json:"file_name" gorm:"size:255;not null;comment:原始文件名"`
	// 存储路径
	ObjectKey   string `json:"object_key" gorm:"size:500;not null;comment:存储路径"`
	// 访问URL(公共=明文,私有=objectKey)
	URL         string `json:"url" gorm:"size:500;not null;comment:访问URL(公共=明文,私有=objectKey)"`
	// 文件大小(字节)
	Size        int64  `json:"size" gorm:"default:0;comment:文件大小(字节)"`
	// MIME类型
	ContentType string `json:"content_type" gorm:"size:100;comment:MIME类型"`
	// public/private
	Visibility  string `json:"visibility" gorm:"size:10;default:private;comment:public/private"`
	// 上传人ID
	UploaderID  uint   `json:"uploader_id" gorm:"not null;comment:上传人ID"`
	BaseModel
}

func (SysAttachment) TableName() string { return "sys_attachment" }
