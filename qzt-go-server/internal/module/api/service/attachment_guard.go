package service

// attachment_guard.go 附件资源归属校验。
//
// 附件表是多态关联(biz_type + resource_id 指向任意模块实体),而附件接口
// 挂在仅登录组,此前任何人枚举 resource_id 即可读他人客户的合同扫描件、
// 再经 /api/file/sign 签 URL 下载。本文件把 biz_type 映射到资源负责人
// (owner)解析规则,读附件前按 datascope 校验,堵住按 id 越权链。
//
// 策略:
//   - biz_type 已登记且能解析出 owner → 走 datascope.CanAccessOwner
//     (资源不存在或无负责人(公海)时放行,由上层按原逻辑返回空列表/404);
//   - biz_type 未登记 → 保守收紧:仅上传人本人或超管可访问;
//   - Sign 下载通道:key 必须对应已登记的附件记录,再按上述规则校验。

import (
	"context"
	"database/sql"
	"errors"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/datascope"
)

// attachmentOwnerRules biz_type → 资源负责人解析规则。
// col 为该表负责人的列名;新业务类型接入附件时在此追加登记。
var attachmentOwnerRules = map[string]struct{ table, col string }{
	"CUSTOMER":    {"crm_customer", "owner_id"},
	"LEAD":        {"crm_lead", "owner_id"},
	"OPPORTUNITY": {"crm_opportunity", "owner_id"},
	"CONTRACT":    {"crm_contract", "owner_id"},
}

// ErrAttachmentDenied 附件访问被拒(对外统一文案,不泄露判定细节)。
var ErrAttachmentDenied = errors.New("无权访问该资源的附件")

// ErrAttachmentNotRegistered 私有文件未登记附件记录,拒绝签名下载。
var ErrAttachmentNotRegistered = errors.New("文件未登记附件记录,无法生成下载链接")

// CheckAttachmentAccess 附件访问校验入口。
// bizType/resourceID 指向附件关联的业务资源;uploaderID 为该附件的上传人
// (未知时传 0,仅按资源归属与超管判定)。
func CheckAttachmentAccess(ctx context.Context, bizType string, resourceID, uploaderID uint, isSuperAdmin bool) error {
	rule, known := attachmentOwnerRules[bizType]
	if known {
		var owner sql.NullInt64
		if err := app.DB.Table(rule.table).Select(rule.col).
			Where("id = ?", resourceID).Scan(&owner).Error; err != nil || !owner.Valid {
			return nil
		}
		if datascope.CanAccessOwner(ctx, uint(owner.Int64)) {
			return nil
		}
		return ErrAttachmentDenied
	}
	// 未登记类型:仅上传人本人或超管(默认收紧,接入时登记规则即可放开)
	_, _, currentUserID := datascope.GetScope(ctx)
	if isSuperAdmin || (uploaderID != 0 && uploaderID == currentUserID) {
		return nil
	}
	return ErrAttachmentDenied
}

// FindByObjectKey 按 objectKey 反查附件记录(Sign 下载通道校验用)。
func (s *AttachmentService) FindByObjectKey(ctx context.Context, objectKey string) (*model.SysAttachment, error) {
	return s.repo.GetByObjectKey(ctx, objectKey)
}
