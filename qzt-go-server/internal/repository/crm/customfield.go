package crm

import (
	"context"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// customfield.go 自定义字段引擎 repository。
// 表单/字段定义 + 各业务实体的字段值表(customer/opportunity/contract/product/follow_up_record)。

// ── 表单 ──

type ModuleFormRepo struct {
	repository.BaseRepo[crmmodel.SysModuleForm]
}

func NewModuleFormRepo() *ModuleFormRepo { return &ModuleFormRepo{} }

func (r *ModuleFormRepo) GetByKey(ctx context.Context, key crmmodel.FormKey) (*crmmodel.SysModuleForm, error) {
	return r.GetOne(ctx, &repository.QueryOptions{Where: map[string]interface{}{"form_key": key}})
}

// ── 字段定义 ──

type ModuleFieldRepo struct {
	repository.BaseRepo[crmmodel.SysModuleField]
}

func NewModuleFieldRepo() *ModuleFieldRepo { return &ModuleFieldRepo{} }

func (r *ModuleFieldRepo) Update(ctx context.Context, m *crmmodel.SysModuleField) error {
	return r.BaseRepo.Update(ctx, m, "InternalKey", "Name", "Type", "Mobile", "Pos", "Readable", "Editable")
}

// ListByForm 列出某表单的全部字段(按 pos 排序)。
func (r *ModuleFieldRepo) ListByForm(ctx context.Context, formID string) ([]crmmodel.SysModuleField, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"form_id": formID},
		Order: []string{"pos ASC", "id ASC"},
	})
}

// GetByStringID 按字符串主键取字段(BaseRepo.GetByID 是 uint,字段主键是 UUID 字符串)。
func (r *ModuleFieldRepo) GetByStringID(ctx context.Context, id string) (*crmmodel.SysModuleField, error) {
	return r.GetOne(ctx, &repository.QueryOptions{Where: map[string]interface{}{"id": id}})
}

// ── 字段大属性 ──

type ModuleFieldBlobRepo struct {
	repository.BaseRepo[crmmodel.SysModuleFieldBlob]
}

func NewModuleFieldBlobRepo() *ModuleFieldBlobRepo { return &ModuleFieldBlobRepo{} }

// GetByIDs 批量取字段大属性(按 field ID 列表)。
func (r *ModuleFieldBlobRepo) GetByIDs(ctx context.Context, ids []string) ([]crmmodel.SysModuleFieldBlob, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	return r.List(ctx, &repository.QueryOptions{
		Conds: []repository.Cond{{Query: "id IN ?", Args: []interface{}{ids}}},
	})
}

// GetByStringID 按字符串主键取字段大属性。
func (r *ModuleFieldBlobRepo) GetByStringID(ctx context.Context, id string) (*crmmodel.SysModuleFieldBlob, error) {
	return r.GetOne(ctx, &repository.QueryOptions{Where: map[string]interface{}{"id": id}})
}

// ── 客户字段值(单值 + BLOB) ──

type CustomerFieldRepo struct {
	repository.BaseRepo[crmmodel.CustomerField]
}

func NewCustomerFieldRepo() *CustomerFieldRepo { return &CustomerFieldRepo{} }

func (r *CustomerFieldRepo) ListByResource(ctx context.Context, resourceID string) ([]crmmodel.CustomerField, error) {
	return r.List(ctx, &repository.QueryOptions{Where: map[string]interface{}{"resource_id": resourceID}})
}

func (r *CustomerFieldRepo) DeleteByResource(ctx context.Context, resourceID string) error {
	return repoDB(ctx).Where("resource_id = ?", resourceID).Delete(&crmmodel.CustomerField{}).Error
}

type CustomerFieldBlobRepo struct {
	repository.BaseRepo[crmmodel.CustomerFieldBlob]
}

func NewCustomerFieldBlobRepo() *CustomerFieldBlobRepo { return &CustomerFieldBlobRepo{} }

func (r *CustomerFieldBlobRepo) ListByResource(ctx context.Context, resourceID string) ([]crmmodel.CustomerFieldBlob, error) {
	return r.List(ctx, &repository.QueryOptions{Where: map[string]interface{}{"resource_id": resourceID}})
}

func (r *CustomerFieldBlobRepo) DeleteByResource(ctx context.Context, resourceID string) error {
	return repoDB(ctx).Where("resource_id = ?", resourceID).Delete(&crmmodel.CustomerFieldBlob{}).Error
}

// DeleteResourceValues 删除某客户的所有自定义字段值(单值 + BLOB)。删客户时调用。
func DeleteCustomerFieldValues(ctx context.Context, resourceID string) error {
	if err := NewCustomerFieldRepo().DeleteByResource(ctx, resourceID); err != nil {
		return err
	}
	return NewCustomerFieldBlobRepo().DeleteByResource(ctx, resourceID)
}

// BulkCreateCustomerFields 批量写入客户单值字段。
func BulkCreateCustomerFields(ctx context.Context, values []crmmodel.CustomerField) error {
	if len(values) == 0 {
		return nil
	}
	return repoDB(ctx).Create(&values).Error
}

// BulkCreateCustomerFieldBlobs 批量写入客户大值字段。
func BulkCreateCustomerFieldBlobs(ctx context.Context, values []crmmodel.CustomerFieldBlob) error {
	if len(values) == 0 {
		return nil
	}
	return repoDB(ctx).Create(&values).Error
}

// DeleteFieldByID 按字符串 ID 删除字段定义(物理删除,因值表主键是字符串)。
func DeleteFieldByID(ctx context.Context, fieldID string) error {
	return repoDB(ctx).Where("id = ?", fieldID).Delete(&crmmodel.SysModuleField{}).Error
}
