package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	crmmodel "qzt-go-server/internal/model/crm"
	crrepo "qzt-go-server/internal/repository/crm"
)

// customfield.go 自定义字段引擎服务。
//
// 两层:
//  1. 表单/字段定义 CRUD(管理员配置):ListFields / CreateField / UpdateField / DeleteField
//  2. 字段值读写(业务实体创建/更新时调用):SaveValues / GetValues / DeleteValues
//     —— 这些值方法接收具体的值表 repo,由各实体 service 注入(客户/商机/合同/产品/跟进各自有 _field/_field_blob 表)。
//
// 值按 field type 路由:单值类型存 {entity}_field(VARCHAR255),BLOB 类型存 {entity}_field_blob(TEXT)。
// 写入策略为先删后写(保证一致性)。

// FieldValue 单个字段值(前端提交)。
type FieldValue struct {
	FieldID string `json:"field_id"`
	Value   string `json:"value"`
}

// FieldDefWithProp 字段定义 + 大属性(返回前端用)。
type FieldDefWithProp struct {
	crmmodel.SysModuleField
	Prop string `json:"prop"`
}

// CustomFieldService 自定义字段定义服务(表单/字段配置)。
type CustomFieldService struct {
	formRepo  *crrepo.ModuleFormRepo
	fieldRepo *crrepo.ModuleFieldRepo
	blobRepo  *crrepo.ModuleFieldBlobRepo
}

func NewCustomFieldService() *CustomFieldService {
	return &CustomFieldService{
		formRepo:  crrepo.NewModuleFormRepo(),
		fieldRepo: crrepo.NewModuleFieldRepo(),
		blobRepo:  crrepo.NewModuleFieldBlobRepo(),
	}
}

// ListFields 列出某表单的全部字段(含大属性),按 pos 排序。
func (s *CustomFieldService) ListFields(ctx context.Context, formKey crmmodel.FormKey) ([]FieldDefWithProp, error) {
	form, err := s.formRepo.GetByKey(ctx, formKey)
	if err != nil {
		return nil, notFoundOr(err, "表单不存在")
	}
	fields, err := s.fieldRepo.ListByForm(ctx, form.ID)
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(fields))
	for _, f := range fields {
		if f.Type.IsBlob() {
			ids = append(ids, f.ID)
		}
	}
	blobs, _ := s.blobRepo.GetByIDs(ctx, ids)
	propMap := make(map[string]string, len(blobs))
	for _, b := range blobs {
		propMap[b.ID] = b.Prop
	}
	out := make([]FieldDefWithProp, 0, len(fields))
	for _, f := range fields {
		out = append(out, FieldDefWithProp{SysModuleField: f, Prop: propMap[f.ID]})
	}
	return out, nil
}

// ListFieldsByFormID 按 formID 列出字段(供实体 service 取字段定义用)。
func (s *CustomFieldService) ListFieldsByFormID(ctx context.Context, formKey crmmodel.FormKey) ([]crmmodel.SysModuleField, error) {
	form, err := s.formRepo.GetByKey(ctx, formKey)
	if err != nil {
		return nil, notFoundOr(err, "表单不存在")
	}
	return s.fieldRepo.ListByForm(ctx, form.ID)
}

// CreateFieldRequest 创建字段请求。
type CreateFieldRequest struct {
	FormKey            crmmodel.FormKey   `json:"form_key" binding:"required"`
	InternalKey        string             `json:"internal_key"`
	Name               string             `json:"name" binding:"required"`
	Type               crmmodel.FieldType `json:"type" binding:"required"`
	Prop               string             `json:"prop"`
	Mobile             int8               `json:"mobile"`
	Pos                int64              `json:"pos"`
	ConvertTargetField string             `json:"convert_target_field"`
}

// CreateField 新增字段定义。
func (s *CustomFieldService) CreateField(ctx context.Context, req *CreateFieldRequest) error {
	form, err := s.formRepo.GetByKey(ctx, req.FormKey)
	if err != nil {
		return notFoundOr(err, "表单不存在")
	}
	id := newFieldID()
	field := &crmmodel.SysModuleField{
		ID: id, FormID: form.ID, InternalKey: req.InternalKey, Name: req.Name,
		Type: req.Type, Mobile: req.Mobile, Pos: req.Pos, Readable: 1, Editable: 1,
		ConvertTargetField: req.ConvertTargetField,
	}
	if err := s.fieldRepo.Create(ctx, field); err != nil {
		return err
	}
	if req.Type.IsBlob() {
		if err := s.blobRepo.Create(ctx, &crmmodel.SysModuleFieldBlob{ID: id, Prop: req.Prop}); err != nil {
			return err
		}
	}
	return nil
}

// UpdateFieldRequest 更新字段请求。
type UpdateFieldRequest struct {
	InternalKey        string             `json:"internal_key"`
	Name               string             `json:"name" binding:"required"`
	Type               crmmodel.FieldType `json:"type" binding:"required"`
	Prop               string             `json:"prop"`
	Mobile             int8               `json:"mobile"`
	Pos                int64              `json:"pos"`
	ConvertTargetField string             `json:"convert_target_field"`
}

// UpdateField 更新字段定义。
func (s *CustomFieldService) UpdateField(ctx context.Context, fieldID string, req *UpdateFieldRequest) error {
	field, err := s.fieldRepo.GetByStringID(ctx, fieldID)
	if err != nil {
		return notFoundOr(err, "字段不存在")
	}
	field.InternalKey = req.InternalKey
	field.Name = req.Name
	field.Type = req.Type
	field.Mobile = req.Mobile
	field.Pos = req.Pos
	field.ConvertTargetField = req.ConvertTargetField
	if err := s.fieldRepo.Update(ctx, field); err != nil {
		return err
	}
	if req.Type.IsBlob() {
		if existing, err := s.blobRepo.GetByStringID(ctx, fieldID); err == nil && existing != nil {
			existing.Prop = req.Prop
			return s.blobRepo.Update(ctx, existing)
		}
		return s.blobRepo.Create(ctx, &crmmodel.SysModuleFieldBlob{ID: fieldID, Prop: req.Prop})
	}
	return nil
}

// DeleteField 删除字段定义(字段主键是字符串,直接物理删除避免脏数据)。
func (s *CustomFieldService) DeleteField(ctx context.Context, fieldID string) error {
	return crrepo.DeleteFieldByID(ctx, fieldID)
}

// ── 字段值读写辅助(各实体 service 直接调用,传入对应值表 repo) ──

// SaveCustomerValues 保存客户的自定义字段值(先删后写)。
func (s *CustomFieldService) SaveCustomerValues(ctx context.Context, resourceID string, values []FieldValue) error {
	if len(values) == 0 {
		return nil
	}
	defs, err := s.ListFieldsByFormID(ctx, crmmodel.FormCustomer)
	if err != nil {
		return err
	}
	typeMap := make(map[string]crmmodel.FieldType, len(defs))
	for _, d := range defs {
		typeMap[d.ID] = d.Type
	}
	var singles []crmmodel.CustomerField
	var blobs []crmmodel.CustomerFieldBlob
	for _, v := range values {
		ft, ok := typeMap[v.FieldID]
		if !ok || v.Value == "" {
			continue
		}
		if ft.IsBlob() {
			blobs = append(blobs, crmmodel.CustomerFieldBlob{ID: newFieldID(), ResourceID: resourceID, FieldID: v.FieldID, FieldValue: v.Value})
		} else {
			singles = append(singles, crmmodel.CustomerField{ID: newFieldID(), ResourceID: resourceID, FieldID: v.FieldID, FieldValue: v.Value})
		}
	}
	// 先删后写
	if err := crrepo.NewCustomerFieldRepo().DeleteByResource(ctx, resourceID); err != nil {
		return err
	}
	if err := crrepo.NewCustomerFieldBlobRepo().DeleteByResource(ctx, resourceID); err != nil {
		return err
	}
	if len(singles) > 0 {
		if err := crrepo.BulkCreateCustomerFields(ctx, singles); err != nil {
			return fmt.Errorf("写入单值字段失败: %w", err)
		}
	}
	if len(blobs) > 0 {
		if err := crrepo.BulkCreateCustomerFieldBlobs(ctx, blobs); err != nil {
			return fmt.Errorf("写入大值字段失败: %w", err)
		}
	}
	return nil
}

// GetCustomerValues 读取客户字段值(field_id -> value)。
func (s *CustomFieldService) GetCustomerValues(ctx context.Context, resourceID string) (map[string]string, error) {
	singles, err := crrepo.NewCustomerFieldRepo().ListByResource(ctx, resourceID)
	if err != nil {
		return nil, err
	}
	blobs, err := crrepo.NewCustomerFieldBlobRepo().ListByResource(ctx, resourceID)
	if err != nil {
		return nil, err
	}
	out := make(map[string]string, len(singles)+len(blobs))
	for _, v := range singles {
		out[v.FieldID] = v.FieldValue
	}
	for _, v := range blobs {
		out[v.FieldID] = v.FieldValue
	}
	return out, nil
}

// DeleteCustomerValues 删除客户全部字段值。
func (s *CustomFieldService) DeleteCustomerValues(ctx context.Context, resourceID string) error {
	return crrepo.DeleteCustomerFieldValues(ctx, resourceID)
}

// newFieldID 生成字段值主键(UUID 去连字符,32 字符,匹配 VARCHAR(32) 列)。
func newFieldID() string {
	return strings.ReplaceAll(uuid.NewString(), "-", "")
}

// ── 线索字段值读写(镜像客户) ──

// SaveLeadValues 保存线索的自定义字段值(先删后写)。
func (s *CustomFieldService) SaveLeadValues(ctx context.Context, resourceID string, values []FieldValue) error {
	if len(values) == 0 {
		return nil
	}
	defs, err := s.ListFieldsByFormID(ctx, crmmodel.FormLead)
	if err != nil {
		return err
	}
	typeMap := make(map[string]crmmodel.FieldType, len(defs))
	for _, d := range defs {
		typeMap[d.ID] = d.Type
	}
	var singles []crmmodel.LeadField
	var blobs []crmmodel.LeadFieldBlob
	for _, v := range values {
		ft, ok := typeMap[v.FieldID]
		if !ok || v.Value == "" {
			continue
		}
		if ft.IsBlob() {
			blobs = append(blobs, crmmodel.LeadFieldBlob{ID: newFieldID(), ResourceID: resourceID, FieldID: v.FieldID, FieldValue: v.Value})
		} else {
			singles = append(singles, crmmodel.LeadField{ID: newFieldID(), ResourceID: resourceID, FieldID: v.FieldID, FieldValue: v.Value})
		}
	}
	// 先删后写
	if err := crrepo.NewLeadFieldRepo().DeleteByResource(ctx, resourceID); err != nil {
		return err
	}
	if err := crrepo.NewLeadFieldBlobRepo().DeleteByResource(ctx, resourceID); err != nil {
		return err
	}
	if len(singles) > 0 {
		if err := crrepo.BulkCreateLeadFields(ctx, singles); err != nil {
			return fmt.Errorf("写入线索单值字段失败: %w", err)
		}
	}
	if len(blobs) > 0 {
		if err := crrepo.BulkCreateLeadFieldBlobs(ctx, blobs); err != nil {
			return fmt.Errorf("写入线索大值字段失败: %w", err)
		}
	}
	return nil
}

// GetLeadValues 读取线索字段值(field_id -> value)。
func (s *CustomFieldService) GetLeadValues(ctx context.Context, resourceID string) (map[string]string, error) {
	singles, err := crrepo.NewLeadFieldRepo().ListByResource(ctx, resourceID)
	if err != nil {
		return nil, err
	}
	blobs, err := crrepo.NewLeadFieldBlobRepo().ListByResource(ctx, resourceID)
	if err != nil {
		return nil, err
	}
	out := make(map[string]string, len(singles)+len(blobs))
	for _, v := range singles {
		out[v.FieldID] = v.FieldValue
	}
	for _, v := range blobs {
		out[v.FieldID] = v.FieldValue
	}
	return out, nil
}

// DeleteLeadValues 删除线索全部字段值。
func (s *CustomFieldService) DeleteLeadValues(ctx context.Context, resourceID string) error {
	return crrepo.DeleteLeadFieldValues(ctx, resourceID)
}

// ConvertLeadFieldValues 线索转化为客户时,按线索字段定义上的 convert_target_field 映射,
// 把线索的自定义字段值搬运到新客户。无映射、空值或客户侧目标字段已删的值一律跳过。
func (s *CustomFieldService) ConvertLeadFieldValues(ctx context.Context, leadID, customerID uint) error {
	defs, err := s.ListFieldsByFormID(ctx, crmmodel.FormLead)
	if err != nil {
		return err
	}
	// 线索字段ID → 目标客户字段ID
	targetMap := make(map[string]string)
	for _, d := range defs {
		if d.ConvertTargetField != "" {
			targetMap[d.ID] = d.ConvertTargetField
		}
	}
	if len(targetMap) == 0 {
		return nil
	}
	leadValues, err := s.GetLeadValues(ctx, formatResourceID(leadID))
	if err != nil {
		return err
	}
	if len(leadValues) == 0 {
		return nil
	}
	// 校验目标客户字段定义是否仍存在(避免写入悬空 field_id)
	custDefs, err := s.ListFieldsByFormID(ctx, crmmodel.FormCustomer)
	if err != nil {
		return err
	}
	custExist := make(map[string]bool, len(custDefs))
	for _, d := range custDefs {
		custExist[d.ID] = true
	}
	values := make([]FieldValue, 0, len(leadValues))
	for leadFieldID, val := range leadValues {
		if val == "" {
			continue
		}
		custFieldID, ok := targetMap[leadFieldID]
		if !ok || !custExist[custFieldID] {
			continue
		}
		values = append(values, FieldValue{FieldID: custFieldID, Value: val})
	}
	if len(values) == 0 {
		return nil
	}
	return s.SaveCustomerValues(ctx, formatResourceID(customerID), values)
}
