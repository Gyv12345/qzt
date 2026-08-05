// Package datascope 数据权限辅助包。
//
// 根据当前用户角色的 data_scope 配置,构造行级数据过滤条件。
// 在 CRM 等业务 List 查询的 QueryOptions.Conds 里注入 datascope.BuildCond() 即可。
//
// 数据范围:
//   1 ALL         — 全部数据(不过滤)
//   3 DEPT        — 本部门数据(owner_id IN 同部门用户)
//   4 DEPT_AND_SUB — 本部门及子部门(owner_id IN 本+子部门用户)
//   5 SELF        — 仅本人(owner_id = 当前用户)
//
// super_admin 或任意角色 data_scope=ALL → 不过滤(取最宽松)。
package datascope

import (
	"context"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/repository"
)

// context key(与 jwt_auth.go 的 key 命名风格一致)
const (
	CtxDeptIDKey    = "dept_id"
	CtxDataScopeKey = "data_scope"
	CtxUserIDKey    = "user_id" // 与 middleware.CtxUserIDKey 一致
)

// GetScope 从 context 取数据权限范围、部门ID、用户ID。
func GetScope(ctx context.Context) (scope int8, deptID uint, userID uint) {
	if v, ok := ctx.Value(CtxDeptIDKey).(uint); ok {
		deptID = v
	}
	if v, ok := ctx.Value(CtxDataScopeKey).(int8); ok {
		scope = v
	}
	if v, ok := ctx.Value(CtxUserIDKey).(uint); ok {
		userID = v
	}
	return
}

// IsSuperAdmin 检查角色码里是否含超管。
func IsSuperAdmin(roleCodes []string) bool {
	for _, c := range roleCodes {
		if c == model.SuperAdminRoleCode {
			return true
		}
	}
	return false
}

// EffectiveScope 取用户多角色中最宽松的 data_scope。
func EffectiveScope(roles []model.SysRole) int8 {
	scope := int8(0)
	for _, r := range roles {
		if r.DataScope == 0 {
			continue
		}
		// 取最小值 = 最宽松(1=ALL 比 5=SELF 更宽松)
		if scope == 0 || r.DataScope < scope {
			scope = r.DataScope
		}
	}
	if scope == 0 {
		scope = model.DataScopeAll // 默认全部
	}
	return scope
}

// BuildCond 根据数据权限构造行级过滤条件。
// ownerColumn 是业务表里"负责人"列名(如 "owner_id")。
// 返回 nil 表示不过滤(全部数据)。
func BuildCond(ctx context.Context, ownerColumn string) *repository.Cond {
	scope, deptID, userID := GetScope(ctx)
	if scope == model.DataScopeAll || userID == 0 {
		return nil
	}
	if ownerColumn == "" {
		ownerColumn = "owner_id"
	}

	switch scope {
	case model.DataScopeSelf:
		return &repository.Cond{
			Query: ownerColumn + " = ?",
			Args:  []interface{}{userID},
		}

	case model.DataScopeDept:
		userIDs := deptUserIDs(ctx, deptID)
		if len(userIDs) == 0 {
			userIDs = []uint{userID} // 部门没人至少能看到自己的
		}
		return &repository.Cond{
			Query: ownerColumn + " IN (?)",
			Args:  []interface{}{userIDs},
		}

	case model.DataScopeDeptAndSub:
		deptIDs := deptAndSubIDs(ctx, deptID)
		userIDs := deptUsersIDsByDepts(ctx, deptIDs)
		if len(userIDs) == 0 {
			userIDs = []uint{userID}
		}
		return &repository.Cond{
			Query: ownerColumn + " IN (?)",
			Args:  []interface{}{userIDs},
		}
	}

	return nil
}

// deptUserIDs 查某部门的全部用户ID。
func deptUserIDs(ctx context.Context, deptID uint) []uint {
	var ids []uint
	repository.DBFrom(ctx).Table("sys_user").
		Where("dept_id = ? AND status = 1 AND deleted_at IS NULL", deptID).
		Pluck("id", &ids)
	return ids
}

// deptUsersIDsByDepts 查多个部门的全部用户ID。
func deptUsersIDsByDepts(ctx context.Context, deptIDs []uint) []uint {
	if len(deptIDs) == 0 {
		return nil
	}
	var ids []uint
	repository.DBFrom(ctx).Table("sys_user").
		Where("dept_id IN (?) AND status = 1 AND deleted_at IS NULL", deptIDs).
		Pluck("id", &ids)
	return ids
}

// deptAndSubIDs 递归取本部门+所有子部门ID。
func deptAndSubIDs(ctx context.Context, deptID uint) []uint {
	if deptID == 0 {
		return nil
	}
	result := []uint{deptID}
	collectChildDepts(ctx, deptID, &result)
	return result
}

// collectChildDepts BFS 收集子部门。
func collectChildDepts(ctx context.Context, parentID uint, result *[]uint) {
	var childIDs []uint
	repository.DBFrom(ctx).Table("hrm_department").
		Where("parent_id = ? AND status = 1 AND deleted_at IS NULL", parentID).
		Pluck("id", &childIDs)
	for _, id := range childIDs {
		*result = append(*result, id)
		collectChildDepts(ctx, id, result) // 递归
	}
}
