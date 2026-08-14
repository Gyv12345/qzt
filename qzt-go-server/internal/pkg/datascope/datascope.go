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
//
// 性能:部门用户/子部门集合在单次请求内按 deptID 缓存(请求级缓存),
// 避免列表翻页或聚合查询时重复查 sys_user / hrm_department。缓存随请求
// context 销毁,不跨请求,无越权风险。
package datascope

import (
	"context"
	"slices"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/repository"
)

// context key(与 jwt_auth.go 的 key 命名风格一致)
const (
	CtxDeptIDKey    = "dept_id"
	CtxDataScopeKey = "data_scope"
	CtxUserIDKey    = "user_id" // 与 middleware.CtxUserIDKey 一致
	ctxCacheKey     = "datascope_cache"
)

// scopeCache 请求级缓存:同一请求内按 deptID 复用部门用户/子部门集合。
// 放进 context 的是一个 *scopeCache 指针(context value 不可变,但指针指向的内容可变);
// Gin 单请求单协程,无需加锁。
type scopeCache struct {
	deptUsers map[uint][]uint // deptID → 该部门用户ID集合
	deptTrees map[uint][]uint // deptID → 本部门+所有子部门ID集合
}

// cacheFrom 取出当前请求的缓存;若中间件未注入则返回 nil(降级为每次查库,保持原行为)。
func cacheFrom(ctx context.Context) *scopeCache {
	if v, ok := ctx.Value(ctxCacheKey).(*scopeCache); ok && v != nil {
		return v
	}
	return nil
}

// WithCache 返回一个携带空缓存的 context 副本,供中间件在请求开始时注入。
// 之后 BuildCond 在同一请求内复用部门用户集合,避免重复查库。
func WithCache(ctx context.Context) context.Context {
	return context.WithValue(ctx, ctxCacheKey, &scopeCache{
		deptUsers: map[uint][]uint{},
		deptTrees: map[uint][]uint{},
	})
}

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
			Args:  []any{userID},
		}

	case model.DataScopeDept:
		userIDs := deptUserIDs(ctx, deptID)
		if len(userIDs) == 0 {
			userIDs = []uint{userID} // 部门没人至少能看到自己的
		}
		return &repository.Cond{
			Query: ownerColumn + " IN (?)",
			Args:  []any{userIDs},
		}

	case model.DataScopeDeptAndSub:
		deptIDs := deptAndSubIDs(ctx, deptID)
		userIDs := deptUsersIDsByDepts(ctx, deptIDs)
		if len(userIDs) == 0 {
			userIDs = []uint{userID}
		}
		return &repository.Cond{
			Query: ownerColumn + " IN (?)",
			Args:  []any{userIDs},
		}
	}

	return nil
}

// CanAccessOwner 判断当前用户的数据权限能否访问指定负责人的单条数据。
// 用于详情/子资源/更新/删除等按 id 直取的场景(列表由 BuildCond 过滤),
// 范围语义与 BuildCond 一致(含部门无人时降级仅本人)。
// ownerID 为 0(公海无主数据)时放行:公海数据对所有有路由权限的用户可见。
func CanAccessOwner(ctx context.Context, ownerID uint) bool {
	scope, deptID, userID := GetScope(ctx)
	if scope == model.DataScopeAll || userID == 0 || ownerID == 0 {
		return true
	}
	switch scope {
	case model.DataScopeSelf:
		return ownerID == userID
	case model.DataScopeDept:
		return ownerIn(deptUserIDs(ctx, deptID), ownerID, userID)
	case model.DataScopeDeptAndSub:
		return ownerIn(deptUsersIDsByDepts(ctx, deptAndSubIDs(ctx, deptID)), ownerID, userID)
	}
	return true
}

// ownerIn 部门用户集合为空时降级为仅本人(与 BuildCond 的降级一致)。
func ownerIn(userIDs []uint, ownerID, userID uint) bool {
	if len(userIDs) == 0 {
		return ownerID == userID
	}
	return slices.Contains(userIDs, ownerID)
}

// deptUserIDs 查某部门的全部用户ID(单请求内按 deptID 缓存)。
func deptUserIDs(ctx context.Context, deptID uint) []uint {
	if c := cacheFrom(ctx); c != nil {
		if ids, ok := c.deptUsers[deptID]; ok {
			return ids
		}
	}
	var ids []uint
	repository.DBFrom(ctx).Table("sys_user").
		Where("dept_id = ? AND status = 1 AND deleted_at IS NULL", deptID).
		Pluck("id", &ids)
	if c := cacheFrom(ctx); c != nil {
		c.deptUsers[deptID] = ids
	}
	return ids
}

// deptUsersIDsByDepts 查多个部门的全部用户ID(命中其中任一已缓存的部门不重复查,
// 其余查库后回填缓存)。多数 DEPT_AND_SUB 调用只有一组 deptIDs,缓存收益主要体现在
// 同一请求多次 BuildCond 的场景(如聚合查询)。
func deptUsersIDsByDepts(ctx context.Context, deptIDs []uint) []uint {
	if len(deptIDs) == 0 {
		return nil
	}
	// 尝试命中:全部 deptID 都在缓存里才直接返回,否则走库查(保持结果完整性)
	if c := cacheFrom(ctx); c != nil {
		allCached := true
		merged := make([]uint, 0)
		for _, d := range deptIDs {
			if ids, ok := c.deptUsers[d]; ok {
				merged = append(merged, ids...)
			} else {
				allCached = false
				break
			}
		}
		if allCached {
			return merged
		}
	}
	var ids []uint
	repository.DBFrom(ctx).Table("sys_user").
		Where("dept_id IN (?) AND status = 1 AND deleted_at IS NULL", deptIDs).
		Pluck("id", &ids)
	return ids
}

// deptAndSubIDs 取本部门+所有子部门ID(单请求内按 deptID 缓存,递归查库只跑一次)。
func deptAndSubIDs(ctx context.Context, deptID uint) []uint {
	if deptID == 0 {
		return nil
	}
	if c := cacheFrom(ctx); c != nil {
		if ids, ok := c.deptTrees[deptID]; ok {
			return ids
		}
	}
	result := []uint{deptID}
	collectChildDepts(ctx, deptID, &result)
	if c := cacheFrom(ctx); c != nil {
		c.deptTrees[deptID] = result
	}
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
