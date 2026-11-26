package service

// im_sync_core.go 通讯录同步(P32 钉钉/飞书)纯函数规划层。
//
// 设计:平台适配器只负责「拉数据」并归一化为 ExternalDept/ExternalUser,
// 落库执行由 im_sync.go 的服务层按本文件产出的 ops 顺序执行。
// 规划函数全部纯函数(不触 DB/HTTP),单测覆盖树映射与匹配策略。
//
// 对账语义(幂等):
//   - 部门:平台存在→create/update(父部门按外部父 id 对齐,先父后子);
//     平台消失→置停用(status=0)不硬删(有员工/审批引用)。
//   - 用户:匹配优先级 外部id绑定 > 手机号精确 > 新建
//     (新建 username=手机号,随机初始密码由执行层生成,remark 标「来自{平台}同步」);
//     手机号冲突(已有同号本地用户)→绑定 external_id 到既有用户,不新建;
//     平台消失→置停用(status=0)不硬删(有审批/合同引用)。

import (
	"fmt"
	"strings"
	"time"
)

// ── 归一化输入 ──

// ExternalDept 平台部门(归一化)。ParentExtID 为平台父部门 id;
// 根直属部门的 ParentExtID 等于平台根哨兵(钉钉 "1"/飞书 "0")。
type ExternalDept struct {
	ExternalID  string
	ParentExtID string
	Name        string
	Sort        int
}

// ExternalUser 平台用户(归一化)。DeptExtID 为主部门外部 id(第一个部门),空=无部门。
type ExternalUser struct {
	ExternalID string
	Name       string
	Mobile     string
	Email      string
	Avatar     string
	DeptExtID  string
}

// ExistingDept 本地已绑定该平台的部门快照(规划输入)。
type ExistingDept struct {
	ID         uint
	ExternalID string
	Name       string
	Code       string
	Status     int8
}

// ExistingUser 本地用户快照(规划输入;含任意来源,供手机号匹配)。
type ExistingUser struct {
	ID         uint
	ExternalID string
	IDSource   string
	Username   string
	Phone      string
	Nickname   string
	Email      string
	Avatar     string
	Status     int8
}

// ── 产出 ops ──

const (
	DeptOpCreate  = "create"
	DeptOpUpdate  = "update"
	DeptOpDisable = "disable"

	UserOpUpdate  = "update"  // 已绑定外部id:更新资料/复启用
	UserOpBind    = "bind"    // 手机号命中既有用户:绑定外部id,不新建
	UserOpCreate  = "create"  // 新建本地用户
	UserOpDisable = "disable" // 平台消失:置停用
)

// DeptOp 部门同步操作。ParentExtID 供执行层解析本地父 id(执行时按序建 ext→local 映射)。
type DeptOp struct {
	Op          string
	LocalID     uint // update/disable
	ExternalID  string
	ParentExtID string // create/update(空=根直属)
	Name        string
	Sort        int
	Code        string // 仅 create:codePrefix+externalID(确定性,重跑幂等)
	Reason      string // 仅 disable
}

// UserOp 用户同步操作。
type UserOp struct {
	Op         string
	LocalID    uint
	ExternalID string
	Username   string // 仅 create
	Nickname   string
	Phone      string
	Email      string
	Avatar     string
	DeptID     *uint // 主部门本地 id(执行层解析;无部门/解析失败为 nil)
	Remark     string
}

// PlanDeptSync 生成部门同步 ops(先父后子 create/update,尾部统一 disable)。
// rootSentinel:平台根哨兵(钉钉 "1"/飞书 "0"),其子部门落本地顶级(ParentID=0)。
// codePrefix:新建部门编码前缀(如 "DT_"/"FS_"),保证与本地手工编码不冲突且幂等。
func PlanDeptSync(rootSentinel, codePrefix string, fetched []ExternalDept, existing []ExistingDept) []DeptOp {
	ops := make([]DeptOp, 0, len(fetched)+len(existing)/4+1)

	// 1. fetched 索引 + 去重(同 id 后到覆盖先到)
	byExt := make(map[string]ExternalDept, len(fetched))
	for _, d := range fetched {
		if d.ExternalID == "" {
			continue
		}
		byExt[d.ExternalID] = d
	}

	// 2. 按深度排序(先父后子;父不在 fetched 中的悬空节点视为根直属)
	type depthItem struct {
		ext   ExternalDept
		depth int
	}
	items := make([]depthItem, 0, len(byExt))
	for _, d := range byExt {
		items = append(items, depthItem{ext: d, depth: deptDepth(d, byExt, rootSentinel)})
	}
	// 稳定排序:同深度按外部 id,保证重跑产出稳定
	for i := 0; i < len(items); i++ {
		for j := i + 1; j < len(items); j++ {
			if items[j].depth < items[i].depth ||
				(items[j].depth == items[i].depth && items[j].ext.ExternalID < items[i].ext.ExternalID) {
				items[i], items[j] = items[j], items[i]
			}
		}
	}

	// 3. existing 索引(仅绑定本平台的部门)
	existingByExt := make(map[string]ExistingDept, len(existing))
	for _, e := range existing {
		if e.ExternalID != "" {
			existingByExt[e.ExternalID] = e
		}
	}

	// 4. create/update ops
	seen := make(map[string]struct{}, len(byExt))
	for _, it := range items {
		d := it.ext
		seen[d.ExternalID] = struct{}{}
		parent := d.ParentExtID
		if parent == rootSentinel {
			parent = "" // 平台根直属 → 本地顶级
		} else if _, ok := byExt[parent]; !ok {
			parent = "" // 悬空父(父部门平台已删但子未删)兜底为顶级
		}
		if e, ok := existingByExt[d.ExternalID]; ok {
			if e.Name != d.Name {
				ops = append(ops, DeptOp{Op: DeptOpUpdate, LocalID: e.ID, ExternalID: d.ExternalID, ParentExtID: parent, Name: d.Name, Sort: d.Sort})
			}
			continue // 名称未变则不动(父级关系由首次绑定确立,不重排本地树)
		}
		ops = append(ops, DeptOp{Op: DeptOpCreate, ExternalID: d.ExternalID, ParentExtID: parent, Name: d.Name, Sort: d.Sort, Code: codePrefix + d.ExternalID})
	}

	// 5. 消失部门 → 置停用不硬删
	for _, e := range existing {
		if e.ExternalID == "" {
			continue
		}
		if _, ok := seen[e.ExternalID]; !ok {
			ops = append(ops, DeptOp{Op: DeptOpDisable, LocalID: e.ID, Reason: "平台通讯录已删除该部门"})
		}
	}
	return ops
}

// deptDepth 计算部门在 fetched 树中的深度(根直属=0;悬空/环路兜底 0)。
func deptDepth(d ExternalDept, byExt map[string]ExternalDept, rootSentinel string) int {
	const maxDepth = 64 // 环路保护
	depth := 0
	cur := d
	visited := map[string]struct{}{d.ExternalID: {}}
	for {
		if cur.ParentExtID == rootSentinel || cur.ParentExtID == "" {
			return depth
		}
		p, ok := byExt[cur.ParentExtID]
		if !ok {
			return 0 // 悬空父按顶级处理
		}
		if _, loop := visited[p.ExternalID]; loop {
			return 0 // 环路兜底
		}
		visited[p.ExternalID] = struct{}{}
		cur = p
		depth++
		if depth > maxDepth {
			return 0
		}
	}
}

// PlanUserSync 生成用户同步 ops。
// takenUsernames:本地已占用用户名全集(新建 username 查重;执行层从 repo 取)。
// resolveDept:外部部门 id → 本地部门 id(执行层闭包;nil=无部门或未映射)。
func PlanUserSync(source, sourceLabel string, fetched []ExternalUser, existing []ExistingUser, takenUsernames map[string]struct{}, resolveDept func(deptExtID string) *uint) []UserOp {
	ops := make([]UserOp, 0, len(fetched)+8)

	// 1. fetched 去重(同一用户挂多部门时适配器应已合并,此处兜底)
	byExt := make(map[string]ExternalUser, len(fetched))
	order := make([]string, 0, len(fetched))
	for _, u := range fetched {
		if u.ExternalID == "" {
			continue
		}
		if _, dup := byExt[u.ExternalID]; !dup {
			order = append(order, u.ExternalID)
		}
		byExt[u.ExternalID] = u
	}

	// 2. existing 索引
	boundByExt := make(map[string]ExistingUser) // 本平台绑定
	phoneByNum := make(map[string]ExistingUser) // 任意来源,手机号精确(首见优先,输入顺序即优先级)
	allUsernames := make(map[string]struct{}, len(existing))
	for _, e := range existing {
		if e.Username != "" {
			allUsernames[e.Username] = struct{}{}
		}
		if e.IDSource == source && e.ExternalID != "" {
			boundByExt[e.ExternalID] = e
		}
		if e.Phone != "" {
			if _, dup := phoneByNum[e.Phone]; !dup {
				phoneByNum[e.Phone] = e
			}
		}
	}
	// 合并占用用户名(执行层传入的全集优先,含软删改写名等)
	for k := range takenUsernames {
		allUsernames[k] = struct{}{}
	}

	// 3. fetched → update/bind/create
	for _, extID := range order {
		u := byExt[extID]
		deptID := resolveDept(u.DeptExtID)
		if e, ok := boundByExt[extID]; ok {
			// 已绑定:资料/部门/状态有变化才 update(幂等,免每日无效写)
			changed := e.Nickname != u.Name || e.Phone != u.Mobile || e.Email != u.Email ||
				e.Avatar != u.Avatar || e.Status != 1 || deptID != nil
			if changed {
				ops = append(ops, UserOp{
					Op: UserOpUpdate, LocalID: e.ID, ExternalID: extID,
					Nickname: u.Name, Phone: u.Mobile, Email: u.Email, Avatar: u.Avatar,
					DeptID: deptID,
				})
			}
			continue
		}
		if u.Mobile != "" {
			if e, ok := phoneByNum[u.Mobile]; ok {
				// 手机号冲突(已有同号本地用户)→ 绑定 external_id,不新建
				ops = append(ops, UserOp{
					Op: UserOpBind, LocalID: e.ID, ExternalID: extID,
					Nickname: u.Name, Phone: u.Mobile, Email: u.Email, Avatar: u.Avatar,
					DeptID: deptID,
				})
				continue
			}
		}
		// 新建:username=手机号(占用则平台前缀兜底),status=1,remark 标来源
		username := PickUsername(source, extID, u.Mobile, allUsernames)
		allUsernames[username] = struct{}{}
		ops = append(ops, UserOp{
			Op: UserOpCreate, ExternalID: extID,
			Username: username, Nickname: u.Name, Phone: u.Mobile, Email: u.Email, Avatar: u.Avatar,
			DeptID: deptID,
			Remark: fmt.Sprintf("来自%s同步", sourceLabel),
		})
	}

	// 4. 消失人员 → 置停用不硬删
	for _, e := range existing {
		if e.IDSource != source || e.ExternalID == "" {
			continue
		}
		if _, ok := byExt[e.ExternalID]; !ok {
			ops = append(ops, UserOp{Op: UserOpDisable, LocalID: e.ID})
		}
	}
	return ops
}

// PickUsername 新建用户名选取:手机号可用即用;否则 平台前缀_外部id;
// 仍冲突追加序号 -2..-99(确定性,重跑结果稳定)。
func PickUsername(source, externalID, mobile string, taken map[string]struct{}) string {
	if mobile != "" {
		if _, ok := taken[mobile]; !ok {
			return mobile
		}
	}
	base := source + "_" + sanitizeUsername(externalID)
	if base == source+"_" { // externalID 全被清洗为空
		base = source + "_u"
	}
	if _, ok := taken[base]; !ok {
		return base
	}
	for i := 2; i < 100; i++ {
		cand := fmt.Sprintf("%s-%d", base, i)
		if _, ok := taken[cand]; !ok {
			return cand
		}
	}
	return fmt.Sprintf("%s-%d", base, time.Now().Unix()) // 理论不可达,兜底唯一
}

// sanitizeUsername 用户名字符白名单(外部 id 可能含非字母数字字符)。
func sanitizeUsername(s string) string {
	var b strings.Builder
	for _, ch := range s {
		switch {
		case ch >= '0' && ch <= '9', ch >= 'a' && ch <= 'z', ch >= 'A' && ch <= 'Z',
			ch == '_', ch == '-', ch == '.':
			b.WriteRune(ch)
		}
	}
	return b.String()
}

// ── 通知外部通道路由 ──
// 路由分支与常量收敛在 internal/pkg/notify(单一事实来源):
// notify.NormalizeExternalChannel / notify.NotifyChannel*。
