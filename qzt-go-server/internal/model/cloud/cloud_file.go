package cloud

import (
	"qzt-go-server/internal/model/base"
)

// 权限范围
const (
	ScopePersonal = "personal" // 个人空间(仅 owner_id)
	ScopeDept     = "dept"     // 部门共享(本部门)
	ScopePublic   = "public"   // 公共空间(全员)
)

// CloudFile 企业网盘文件/文件夹。
type CloudFile struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	// 父文件夹ID(0=根)
	ParentID    uint   `json:"parent_id" gorm:"default:0;index;comment:父文件夹ID(0=根)"`
	// 文件/文件夹名
	Name        string `json:"name" gorm:"size:255;not null;comment:文件/文件夹名"`
	// 0=文件 1=文件夹
	IsDir       int8   `json:"is_dir" gorm:"default:0;comment:0=文件 1=文件夹"`
	// OSS存储路径
	ObjectKey   string `json:"object_key" gorm:"size:500;comment:OSS存储路径"`
	// 访问URL
	URL         string `json:"url" gorm:"size:1000;comment:访问URL"`
	// 文件大小(字节)
	Size        int64  `json:"size" gorm:"default:0;comment:文件大小(字节)"`
	// MIME类型
	ContentType string `json:"content_type" gorm:"size:100;comment:MIME类型"`
	// 权限(personal/dept/public)
	Scope       string `json:"scope" gorm:"size:20;default:personal;index;comment:权限(personal/dept/public)"`
	// 归属人(personal时用)
	OwnerID     *uint  `json:"owner_id" gorm:"index;comment:归属人(personal时用)"`
	// 归属部门(dept时用)
	DeptID      *uint  `json:"dept_id" gorm:"index;comment:归属部门(dept时用)"`
	// 上传/创建人
	CreatorID   uint   `json:"creator_id" gorm:"comment:上传/创建人"`
	// 1正常 0回收站
	Status      int8   `json:"status" gorm:"default:1;comment:1正常 0回收站"`
	base.BaseModel
}

func (CloudFile) TableName() string { return "cloud_file" }
