package psi

import (
	"qzt-go-server/internal/model/base"
)

// warehouse.go 进销存仓库 + 供应商档案。

// PsiWarehouse 仓库。
type PsiWarehouse struct {
	ID        uint   `json:"id" gorm:"primaryKey"`
	// 仓库编码
	Code      string `json:"code" gorm:"size:32;uniqueIndex:uk_code;not null;comment:仓库编码"`
	// 仓库名称
	Name      string `json:"name" gorm:"size:255;index;not null;comment:仓库名称"`
	// 仓库地址
	Address   string `json:"address" gorm:"size:500;comment:仓库地址"`
	// 负责人ID
	ManagerID *uint  `json:"manager_id" gorm:"comment:负责人ID"`
	// 联系电话
	Phone     string `json:"phone" gorm:"size:30;comment:联系电话"`
	// 排序
	Sort      int    `json:"sort" gorm:"default:0;comment:排序"`
	// 1启用 2停用
	Status    int8   `json:"status" gorm:"default:1;index;comment:1启用 2停用"`
	// 0否 1默认仓库
	IsDefault int8   `json:"is_default" gorm:"default:0;comment:0否 1默认仓库"`
	Remark    string `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (PsiWarehouse) TableName() string { return "psi_warehouse" }

// PsiSupplier 供应商档案(采购卖方)。独立于 CRM 客户。
type PsiSupplier struct {
	ID           uint   `json:"id" gorm:"primaryKey"`
	// 供应商名称
	Name         string `json:"name" gorm:"size:255;index;not null;comment:供应商名称"`
	// 供应商编号
	SupplierNo   string `json:"supplier_no" gorm:"size:64;comment:供应商编号"`
	// 联系人
	ContactPerson string `json:"contact_person" gorm:"size:100;comment:联系人"`
	// 电话
	Phone        string `json:"phone" gorm:"size:30;comment:电话"`
	// 邮箱
	Email        string `json:"email" gorm:"size:100;comment:邮箱"`
	// 地址
	Address      string `json:"address" gorm:"size:500;comment:地址"`
	// 开户银行
	BankName     string `json:"bank_name" gorm:"size:100;comment:开户银行"`
	// 银行账号
	BankAccount  string `json:"bank_account" gorm:"size:64;comment:银行账号"`
	// 1启用 2停用
	Status       int8   `json:"status" gorm:"default:1;index;comment:1启用 2停用"`
	Remark       string `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (PsiSupplier) TableName() string { return "psi_supplier" }
