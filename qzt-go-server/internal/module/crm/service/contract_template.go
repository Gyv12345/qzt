package service

import (
	"context"
	"fmt"
	"regexp"
	"time"

	"github.com/shopspring/decimal"

	"qzt-go-server/pkg/xtime"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
	userrepo "qzt-go-server/internal/repository"
)

// contract_template.go 合同模板服务 + 套打文档渲染。
// 模板存「带 ${变量} 占位符的 Markdown 正文」,打印合同时聚合合同/客户/抬头/负责人数据替换变量。

// ──────────────────────────────────────────────────────────────
// 模板 CRUD
// ──────────────────────────────────────────────────────────────

// ContractTemplateService 合同模板服务。
type ContractTemplateService struct {
	repo *crrepo.ContractTemplateRepo
}

func NewContractTemplateService() *ContractTemplateService {
	return &ContractTemplateService{repo: crrepo.NewContractTemplateRepo()}
}

// CreateContractTemplateRequest 创建模板请求。
type CreateContractTemplateRequest struct {
	Name    string `json:"name" binding:"required"`
	Content string `json:"content" binding:"required"`
	Remark  string `json:"remark"`
	Enabled *int8  `json:"enabled"`
}

func (s *ContractTemplateService) Create(ctx context.Context, req *CreateContractTemplateRequest, ownerID uint) (*crmmodel.ContractTemplate, error) {
	enabled := int8(1)
	if req.Enabled != nil {
		enabled = *req.Enabled
	}
	t := &crmmodel.ContractTemplate{
		Name:    req.Name,
		Content: req.Content,
		Remark:  req.Remark,
		Enabled: enabled,
		OwnerID: &ownerID,
	}
	if err := s.repo.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

// UpdateContractTemplateRequest 更新模板请求(null 字段跳过)。
type UpdateContractTemplateRequest struct {
	Name    *string `json:"name"`
	Content *string `json:"content"`
	Remark  *string `json:"remark"`
	Enabled *int8   `json:"enabled"`
}

func (s *ContractTemplateService) Update(ctx context.Context, id uint, req *UpdateContractTemplateRequest) error {
	t, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "合同模板不存在")
	}
	if req.Name != nil {
		t.Name = *req.Name
	}
	if req.Content != nil {
		t.Content = *req.Content
	}
	if req.Remark != nil {
		t.Remark = *req.Remark
	}
	if req.Enabled != nil {
		t.Enabled = *req.Enabled
	}
	return s.repo.Update(ctx, t)
}

func (s *ContractTemplateService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "合同模板不存在")
	}
	return s.repo.Delete(ctx, id)
}

func (s *ContractTemplateService) GetByID(ctx context.Context, id uint) (*crmmodel.ContractTemplate, error) {
	t, err := s.repo.GetByID(ctx, id)
	return t, notFoundOr(err, "合同模板不存在")
}

// ListContractTemplate 列表(keyword 模糊匹配 name + enabled 过滤,列表不含 content 正文)。
func (s *ContractTemplateService) List(ctx context.Context, page, pageSize int, keyword string, enabled *int8) ([]crmmodel.ContractTemplate, int64, error) {
	opts := &repository.QueryOptions{
		Search: map[string]string{"name": keyword},
		Select: []string{"id", "name", "remark", "enabled", "owner_id", "created_at", "updated_at"},
		Order:  []string{"id DESC"},
	}
	if enabled != nil {
		opts.Where = map[string]any{"enabled": *enabled}
	}
	return s.repo.PageList(ctx, page, pageSize, opts)
}

// ──────────────────────────────────────────────────────────────
// 变量元数据(供前端编辑器「插入变量」下拉)
// ──────────────────────────────────────────────────────────────

// VariableMeta 模板变量元数据。
type VariableMeta struct {
	Key   string `json:"key"`
	Group string `json:"group"`
	Label string `json:"label"`
}

// VariableMetas 返回全部可用变量的元数据(按分组顺序)。
func VariableMetas() []VariableMeta {
	return []VariableMeta{
		// 合同
		{Key: "contractNo", Group: "合同", Label: "合同编号"},
		{Key: "contractName", Group: "合同", Label: "合同名称"},
		{Key: "totalAmount", Group: "合同", Label: "合同总额"},
		{Key: "receivedAmount", Group: "合同", Label: "已回款"},
		{Key: "unreceivedAmount", Group: "合同", Label: "未回款"},
		{Key: "signedDate", Group: "合同", Label: "签订日期"},
		{Key: "startDate", Group: "合同", Label: "开始日期"},
		{Key: "endDate", Group: "合同", Label: "结束日期"},
		{Key: "stage", Group: "合同", Label: "阶段"},
		// 客户
		{Key: "customerName", Group: "客户", Label: "客户名称"},
		{Key: "customerNo", Group: "客户", Label: "客户编号"},
		{Key: "customerLevel", Group: "客户", Label: "客户级别"},
		{Key: "customerSource", Group: "客户", Label: "客户来源"},
		{Key: "customerIndustry", Group: "客户", Label: "行业"},
		// 工商抬头
		{Key: "titleName", Group: "工商抬头", Label: "企业名称"},
		{Key: "taxNo", Group: "工商抬头", Label: "税号"},
		{Key: "bankName", Group: "工商抬头", Label: "开户行"},
		{Key: "bankAccount", Group: "工商抬头", Label: "银行账号"},
		{Key: "titleAddress", Group: "工商抬头", Label: "地址"},
		{Key: "titlePhone", Group: "工商抬头", Label: "电话"},
		// 负责人
		{Key: "ownerName", Group: "负责人", Label: "负责人姓名"},
		{Key: "ownerPhone", Group: "负责人", Label: "负责人电话"},
		// 产品
		{Key: "productTable", Group: "产品", Label: "产品明细表"},
		// 系统
		{Key: "currentDate", Group: "系统", Label: "当前日期"},
	}
}

// ──────────────────────────────────────────────────────────────
// 模板渲染器
// ──────────────────────────────────────────────────────────────

var varPattern = regexp.MustCompile(`\$\{(\w+)}`)

// renderTemplate 把含 ${变量} 占位符的 Markdown 用实际数据替换。
// 变量不存在或值为空 → 替换为空串(不留 ${key},避免打印出占位符)。
func renderTemplate(md string, vars map[string]string) string {
	if md == "" {
		return ""
	}
	return varPattern.ReplaceAllStringFunc(md, func(match string) string {
		key := varPattern.FindStringSubmatch(match)[1]
		return vars[key] // map 未命中的 key 返回零值 ""
	})
}

// ──────────────────────────────────────────────────────────────
// 合同文档服务(聚合变量 + 套打渲染)
// ──────────────────────────────────────────────────────────────

// ContractDocumentService 合同文档变量聚合 + 套打渲染。
type ContractDocumentService struct {
	contractRepo *crrepo.ContractRepo
	customerRepo *crrepo.CustomerRepo
	titleRepo    *crrepo.BusinessTitleRepo
	userRepo     *userrepo.UserRepo
	templateRepo *crrepo.ContractTemplateRepo
}

func NewContractDocumentService() *ContractDocumentService {
	return &ContractDocumentService{
		contractRepo: crrepo.NewContractRepo(),
		customerRepo: crrepo.NewCustomerRepo(),
		titleRepo:    crrepo.NewBusinessTitleRepo(),
		userRepo:     userrepo.NewUserRepo(),
		templateRepo: crrepo.NewContractTemplateRepo(),
	}
}

// BuildVars 聚合打印合同文档所需的全部变量。
// 任一关联实体缺失(客户/抬头/负责人)时对应变量留空,不中断渲染。
func (s *ContractDocumentService) BuildVars(ctx context.Context, contractID uint) (map[string]string, error) {
	contract, err := s.contractRepo.GetByID(ctx, contractID)
	if err != nil {
		return nil, notFoundOr(err, "合同不存在")
	}

	vars := make(map[string]string)

	// 合同字段
	vars["contractNo"] = contract.ContractNo
	vars["contractName"] = contract.Name
	vars["totalAmount"] = formatAmount(contract.TotalAmount)
	vars["receivedAmount"] = formatAmount(contract.ReceivedAmount)
	vars["unreceivedAmount"] = formatAmount(contract.TotalAmount.Sub(contract.ReceivedAmount))
	vars["signedDate"] = formatDate(contract.SignedDate)
	vars["startDate"] = formatDate(contract.StartDate)
	vars["endDate"] = formatDate(contract.EndDate)
	vars["stage"] = contract.Stage

	// 客户
	if contract.CustomerID > 0 {
		if customer, err := s.customerRepo.GetByID(ctx, contract.CustomerID); err == nil && customer != nil {
			vars["customerName"] = customer.Name
			vars["customerNo"] = customer.CustomerNo
			vars["customerLevel"] = customer.Level
			vars["customerSource"] = customer.Source
			vars["customerIndustry"] = customer.Industry
		}
	}

	// 工商抬头
	if contract.TitleID != nil && *contract.TitleID > 0 {
		if title, err := s.titleRepo.GetByID(ctx, *contract.TitleID); err == nil && title != nil {
			vars["titleName"] = title.Name
			vars["taxNo"] = title.TaxNo
			vars["bankName"] = title.BankName
			vars["bankAccount"] = title.BankAccount
			vars["titleAddress"] = title.Address
			vars["titlePhone"] = title.Phone
		}
	}

	// 负责人
	if contract.OwnerID != nil && *contract.OwnerID > 0 {
		if user, err := s.userRepo.GetByID(ctx, *contract.OwnerID); err == nil && user != nil {
			name := user.Nickname
			if name == "" {
				name = user.Username
			}
			vars["ownerName"] = name
			vars["ownerPhone"] = user.Phone
		}
	}

	// 系统
	vars["currentDate"] = time.Now().Format("2006-01-02")

	// 产品明细表
	vars["productTable"] = NewContractItemService().BuildProductTable(ctx, contractID)

	return vars, nil
}

// Render 套打渲染:用指定模板 + 合同数据生成完整 Markdown 文档。
func (s *ContractDocumentService) Render(ctx context.Context, contractID, templateID uint) (string, error) {
	t, err := s.templateRepo.GetByID(ctx, templateID)
	if err != nil {
		return "", notFoundOr(err, "合同模板不存在")
	}
	vars, err := s.BuildVars(ctx, contractID)
	if err != nil {
		return "", err
	}
	return renderTemplate(t.Content, vars), nil
}

// ── 辅助 ──

func formatAmount(d decimal.Decimal) string {
	return d.String()
}

func formatDate(t xtime.NullDateTime) string {
	if t.IsZero() {
		return ""
	}
	return time.Time(t).Format("2006-01-02")
}

// 确保 fmt 在辅助函数错误信息中被引用(未来扩展)
var _ = fmt.Sprintf
