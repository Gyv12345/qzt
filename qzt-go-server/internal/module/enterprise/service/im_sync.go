package service

// im_sync.go 通讯录同步服务(P32 钉钉/飞书)。
//
// 流程(每平台独立,幂等对账):
//  1. 读 sys_oauth_config(平台启用且配置完整,否则跳过/报错)
//  2. 拉部门树 → PlanDeptSync 规划 → 执行 create/update/disable
//  3. 拉各部门人员 → PlanUserSync 规划 → 执行 update/bind/create/disable
//  4. 写同步结果摘要(Redis,状态端点读)+ audit 日志
//
// 定时入口:sys_job bean contact.sync.dingtalk / contact.sync.feishu(见 contact_sync_job.go);
// 手动入口:POST /enterprise/contact-sync/{dingtalk|feishu}(超管)。

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"qzt-go-server/internal/model"
	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/pkg/dingtalk"
	"qzt-go-server/internal/pkg/feishu"
	"qzt-go-server/internal/repository"
	hrmrepo "qzt-go-server/internal/repository/hrm"
	"qzt-go-server/pkg/xcryption"
	"qzt-go-server/pkg/xlogger"
)

// SyncResult 一次同步的统计摘要。
type SyncResult struct {
	Platform      string    `json:"platform"`
	FinishedAt    time.Time `json:"finished_at"`
	DeptsCreated  int       `json:"depts_created"`
	DeptsUpdated  int       `json:"depts_updated"`
	DeptsDisabled int       `json:"depts_disabled"`
	UsersUpdated  int       `json:"users_updated"`
	UsersBound    int       `json:"users_bound"`
	UsersCreated  int       `json:"users_created"`
	UsersDisabled int       `json:"users_disabled"`
	OpErrors      int       `json:"op_errors"`
	Error         string    `json:"error,omitempty"`
}

// ContactSyncService 通讯录同步服务。
type ContactSyncService struct {
	oauthRepo *repository.OauthConfigRepo
	userRepo  *repository.UserRepo
	deptRepo  *hrmrepo.DepartmentRepo
}

func NewContactSyncService() *ContactSyncService {
	return &ContactSyncService{
		oauthRepo: repository.NewOauthConfigRepo(),
		userRepo:  repository.NewUserRepo(),
		deptRepo:  hrmrepo.NewDepartmentRepo(),
	}
}

// syncStatusKey 同步结果摘要的 Redis key(状态端点读)。
func syncStatusKey(platform string) string { return "qzt:contact-sync:" + platform + ":last" }

const syncStatusTTL = 90 * 24 * time.Hour

// Sync 执行指定平台(dingtalk/feishu)的全量通讯录对账同步。
func (s *ContactSyncService) Sync(ctx context.Context, platform string) (*SyncResult, error) {
	switch platform {
	case model.IDSourceDingtalk:
		return s.syncDingtalk(ctx)
	case model.IDSourceFeishu:
		return s.syncFeishu(ctx)
	default:
		return nil, fmt.Errorf("不支持的平台: %s(仅 dingtalk/feishu)", platform)
	}
}

// GetLastStatus 读取某平台最近一次同步结果摘要(手动触发/状态端点用)。
func (s *ContactSyncService) GetLastStatus(ctx context.Context, platform string) (*SyncResult, error) {
	if platform != model.IDSourceDingtalk && platform != model.IDSourceFeishu {
		return nil, fmt.Errorf("不支持的平台: %s(仅 dingtalk/feishu)", platform)
	}
	store := cacheStore()
	if store == nil {
		return nil, errors.New("缓存未初始化,暂无同步状态")
	}
	val, err := store.Get(syncStatusKey(platform))
	if err != nil || val == "" {
		return nil, errors.New("该平台尚未执行过同步")
	}
	var res SyncResult
	if err := json.Unmarshal([]byte(val), &res); err != nil {
		return nil, fmt.Errorf("同步状态解析失败: %w", err)
	}
	return &res, nil
}

// saveStatus 记录同步结果摘要(Redis;失败仅告警不影响同步本身)。
func (s *ContactSyncService) saveStatus(ctx context.Context, res *SyncResult) {
	store := cacheStore()
	if store == nil {
		return
	}
	data, err := json.Marshal(res)
	if err != nil {
		return
	}
	if err := store.Set(syncStatusKey(res.Platform), string(data), syncStatusTTL); err != nil {
		xlogger.ErrorfCtx(ctx, "通讯录同步:写入状态摘要失败 platform=%s: %v", res.Platform, err)
	}
}

// ── 钉钉 ──

func (s *ContactSyncService) syncDingtalk(ctx context.Context) (*SyncResult, error) {
	res := &SyncResult{Platform: model.IDSourceDingtalk, FinishedAt: time.Now()}
	cfg, err := s.oauthRepo.GetEnabledByProvider(ctx, model.OAuthProviderDingtalk)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return res, errors.New("钉钉未启用,请在「第三方应用」中启用钉钉配置")
		}
		return res, fmt.Errorf("读取钉钉配置失败: %w", err)
	}
	var extra struct {
		AgentID string `json:"agent_id"`
	}
	if cfg.Extra != "" {
		_ = json.Unmarshal([]byte(cfg.Extra), &extra)
	}
	agentID := extra.AgentID
	if agentID == "" {
		agentID = cfg.AgentID // 兼容:直接填 AgentID 列的配置
	}
	client := dingtalk.NewClient(dingtalk.Config{AppKey: cfg.AppID, AppSecret: cfg.AppSecret, AgentID: agentID})
	if !client.IsConfigured() {
		return res, errors.New("钉钉配置不完整(app_key/app_secret 未填写)")
	}

	// 1. 部门
	rawDepts, err := client.ListDepartments(ctx)
	if err != nil {
		res.Error = err.Error()
		s.finish(ctx, res)
		return res, fmt.Errorf("拉取钉钉部门失败: %w", err)
	}
	fetched := make([]ExternalDept, 0, len(rawDepts))
	for i, d := range rawDepts {
		fetched = append(fetched, ExternalDept{
			ExternalID:  dingtalk.FormatInt64(d.DeptID),
			ParentExtID: dingtalk.FormatInt64(d.ParentID),
			Name:        d.Name,
			Sort:        i,
		})
	}
	deptsByExt, err := s.applyDeptOps(ctx, res, model.IDSourceDingtalk, "DT_", fetched)
	if err != nil {
		res.Error = err.Error()
		s.finish(ctx, res)
		return res, err
	}

	// 2. 用户(按部门拉取,合并去重;主部门=dept_id_list[0])
	existingUsers, err := s.userRepo.ListByIDSource(ctx, model.IDSourceDingtalk)
	if err != nil {
		res.Error = err.Error()
		s.finish(ctx, res)
		return res, err
	}
	fetchedUsers, err := s.fetchDingtalkUsers(ctx, client)
	if err != nil {
		res.Error = err.Error()
		s.finish(ctx, res)
		return res, fmt.Errorf("拉取钉钉用户失败: %w", err)
	}
	s.applyUserOps(ctx, res, model.IDSourceDingtalk, "钉钉", existingUsers, fetchedUsers, deptsByExt)

	s.finish(ctx, res)
	return res, nil
}

// fetchDingtalkUsers 按部门拉全部用户并按 userid 去重;列表缺手机号时补拉详情。
func (s *ContactSyncService) fetchDingtalkUsers(ctx context.Context, client *dingtalk.Client) ([]ExternalUser, error) {
	depts, err := client.ListDepartments(ctx)
	if err != nil {
		return nil, err
	}
	merged := make(map[string]*dingtalk.UserBrief, 128)
	for _, d := range depts {
		users, uerr := client.ListDeptUsers(ctx, d.DeptID)
		if uerr != nil {
			xlogger.ErrorfCtx(ctx, "通讯录同步:拉取钉钉部门用户失败 dept=%s: %v", dingtalk.FormatInt64(d.DeptID), uerr)
			continue
		}
		for i := range users {
			u := users[i]
			if u.UserID == "" {
				continue
			}
			if old, ok := merged[u.UserID]; ok {
				// 保留首个(主属部门在首个出现的部门列表中已含),补齐空手机号
				if old.Mobile == "" && u.Mobile != "" {
					old.Mobile = u.Mobile
				}
				continue
			}
			merged[u.UserID] = &users[i]
		}
	}
	out := make([]ExternalUser, 0, len(merged))
	for _, u := range merged {
		mobile := u.Mobile
		if mobile == "" {
			// 列表接口未给手机号(权限不足时):补拉详情,仍失败则留空
			if detail, derr := client.GetUserDetail(ctx, u.UserID); derr == nil {
				mobile = detail.Mobile
			}
		}
		primary := ""
		if len(u.DeptIDList) > 0 {
			primary = dingtalk.FormatInt64(u.DeptIDList[0])
		}
		out = append(out, ExternalUser{
			ExternalID: u.UserID,
			Name:       u.Name,
			Mobile:     mobile,
			DeptExtID:  primary,
		})
	}
	return out, nil
}

// ── 飞书 ──

func (s *ContactSyncService) syncFeishu(ctx context.Context) (*SyncResult, error) {
	res := &SyncResult{Platform: model.IDSourceFeishu, FinishedAt: time.Now()}
	cfg, err := s.oauthRepo.GetEnabledByProvider(ctx, model.OAuthProviderFeishu)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return res, errors.New("飞书未启用,请在「第三方应用」中启用飞书配置")
		}
		return res, fmt.Errorf("读取飞书配置失败: %w", err)
	}
	client := feishu.NewClient(feishu.Config{AppID: cfg.AppID, AppSecret: cfg.AppSecret})
	if !client.IsConfigured() {
		return res, errors.New("飞书配置不完整(app_id/app_secret 未填写)")
	}

	// 1. 部门
	rawDepts, err := client.ListAllDepartments(ctx)
	if err != nil {
		res.Error = err.Error()
		s.finish(ctx, res)
		return res, fmt.Errorf("拉取飞书部门失败: %w", err)
	}
	fetched := make([]ExternalDept, 0, len(rawDepts))
	for _, d := range rawDepts {
		fetched = append(fetched, ExternalDept{
			ExternalID:  d.OpenID,
			ParentExtID: d.ParentOpen,
			Name:        d.Name,
			Sort:        d.Order,
		})
	}
	deptsByExt, err := s.applyDeptOps(ctx, res, model.IDSourceFeishu, "FS_", fetched)
	if err != nil {
		res.Error = err.Error()
		s.finish(ctx, res)
		return res, err
	}

	// 2. 用户
	existingUsers, err := s.userRepo.ListByIDSource(ctx, model.IDSourceFeishu)
	if err != nil {
		res.Error = err.Error()
		s.finish(ctx, res)
		return res, err
	}
	fetchedUsers, err := s.fetchFeishuUsers(ctx, client)
	if err != nil {
		res.Error = err.Error()
		s.finish(ctx, res)
		return res, fmt.Errorf("拉取飞书用户失败: %w", err)
	}
	s.applyUserOps(ctx, res, model.IDSourceFeishu, "飞书", existingUsers, fetchedUsers, deptsByExt)

	s.finish(ctx, res)
	return res, nil
}

// fetchFeishuUsers 按部门拉全部用户并按 open_id 去重(主部门=department_ids[0] 中已映射的部门)。
func (s *ContactSyncService) fetchFeishuUsers(ctx context.Context, client *feishu.Client) ([]ExternalUser, error) {
	depts, err := client.ListAllDepartments(ctx)
	if err != nil {
		return nil, err
	}
	merged := make(map[string]*feishu.User, 128)
	for _, d := range depts {
		users, uerr := client.ListUsersByDept(ctx, d.OpenID)
		if uerr != nil {
			xlogger.ErrorfCtx(ctx, "通讯录同步:拉取飞书部门用户失败 dept=%s: %v", d.OpenID, uerr)
			continue
		}
		for i := range users {
			u := users[i]
			if u.OpenID == "" {
				continue
			}
			if old, ok := merged[u.OpenID]; ok {
				if old.Mobile == "" && u.Mobile != "" {
					old.Mobile = u.Mobile
				}
				continue
			}
			merged[u.OpenID] = &users[i]
		}
	}
	out := make([]ExternalUser, 0, len(merged))
	for _, u := range merged {
		primary := ""
		if len(u.Depts) > 0 {
			primary = u.Depts[0]
		}
		out = append(out, ExternalUser{
			ExternalID: u.OpenID,
			Name:       u.Name,
			Mobile:     u.Mobile,
			Email:      u.Email,
			DeptExtID:  primary,
		})
	}
	return out, nil
}

// ── 执行 ops ──

// applyDeptOps 执行部门 ops(计数写入 res),返回 外部id→本地id 映射(含既有绑定)。
func (s *ContactSyncService) applyDeptOps(ctx context.Context, res *SyncResult, source, codePrefix string, fetched []ExternalDept) (map[string]uint, error) {
	existing, err := s.deptRepo.ListByIDSource(ctx, source)
	if err != nil {
		return nil, err
	}
	existingRows := make([]ExistingDept, 0, len(existing))
	extToLocal := make(map[string]uint, len(existing)+len(fetched))
	for _, e := range existing {
		existingRows = append(existingRows, ExistingDept{
			ID: e.ID, ExternalID: e.ExternalID, Name: e.Name, Code: e.Code, Status: e.Status,
		})
		if e.ExternalID != "" {
			extToLocal[e.ExternalID] = e.ID
		}
	}
	ops := PlanDeptSync(rootSentinelOf(source), codePrefix, fetched, existingRows)

	for _, op := range ops {
		switch op.Op {
		case DeptOpCreate:
			dept := &hrmmodel.HrmDepartment{
				ParentID:   resolveParentLocal(extToLocal, op.ParentExtID),
				Name:       op.Name,
				Code:       op.Code,
				Sort:       op.Sort,
				Status:     1,
				ExternalID: op.ExternalID,
				IDSource:   source,
			}
			if err := s.deptRepo.Create(ctx, dept); err != nil {
				return extToLocal, fmt.Errorf("创建部门失败(%s/%s): %w", op.ExternalID, op.Name, err)
			}
			extToLocal[op.ExternalID] = dept.ID
			res.DeptsCreated++
		case DeptOpUpdate:
			parent := resolveParentLocal(extToLocal, op.ParentExtID)
			m := &hrmmodel.HrmDepartment{
				ID:         op.LocalID,
				ParentID:   parent,
				Name:       op.Name,
				ExternalID: op.ExternalID,
				IDSource:   source,
			}
			if err := s.deptRepo.SyncUpdate(ctx, m); err != nil {
				return extToLocal, fmt.Errorf("更新部门失败(%d): %w", op.LocalID, err)
			}
			res.DeptsUpdated++
		case DeptOpDisable:
			m := &hrmmodel.HrmDepartment{ID: op.LocalID, Status: 0}
			if err := s.deptRepo.Update(ctx, m); err != nil {
				return extToLocal, fmt.Errorf("停用部门失败(%d): %w", op.LocalID, err)
			}
			res.DeptsDisabled++
		}
	}
	return extToLocal, nil
}

// applyUserOps 执行用户 ops(错误逐条记录进 res.OpErrors,不中断整轮同步)。
func (s *ContactSyncService) applyUserOps(ctx context.Context, res *SyncResult, source, sourceLabel string, existing []model.SysUser, fetched []ExternalUser, deptsByExt map[string]uint) {
	existingRows := make([]ExistingUser, 0, len(existing))
	for _, e := range existing {
		existingRows = append(existingRows, ExistingUser{
			ID: e.ID, ExternalID: e.ExternalID, IDSource: e.IDSource,
			Username: e.Username, Phone: e.Phone, Nickname: e.Nickname,
			Email: e.Email, Avatar: e.Avatar, Status: e.Status,
		})
	}

	// 新建用户名查重全集(现有用户名批量取回)
	candidates := make([]string, 0, len(existing))
	for _, e := range existing {
		candidates = append(candidates, e.Username)
	}
	taken, err := s.userRepo.GetUsernamesByList(ctx, candidates)
	if err != nil {
		res.Error = "用户名查重失败: " + err.Error()
		return
	}

	resolveDept := func(deptExtID string) *uint {
		if deptExtID == "" {
			return nil
		}
		if id, ok := deptsByExt[deptExtID]; ok {
			v := id
			return &v
		}
		return nil
	}

	ops := PlanUserSync(source, sourceLabel, fetched, existingRows, taken, resolveDept)
	for _, op := range ops {
		switch op.Op {
		case UserOpUpdate:
			if err := s.syncUpdateUser(ctx, op, source, sourceLabel); err != nil {
				res.OpErrors++
				xlogger.ErrorfCtx(ctx, "通讯录同步:更新用户失败(%d): %v", op.LocalID, err)
			} else {
				res.UsersUpdated++
			}
		case UserOpBind:
			if err := s.bindExternalUser(ctx, op, source, sourceLabel); err != nil {
				res.OpErrors++
				xlogger.ErrorfCtx(ctx, "通讯录同步:绑定用户失败(%d): %v", op.LocalID, err)
			} else {
				res.UsersBound++
			}
		case UserOpCreate:
			if err := s.createUser(ctx, op, source); err != nil {
				res.OpErrors++
				xlogger.ErrorfCtx(ctx, "通讯录同步:创建用户失败(%s): %v", op.Username, err)
			} else {
				res.UsersCreated++
			}
		case UserOpDisable:
			if err := s.disableUser(ctx, op.LocalID); err != nil {
				res.OpErrors++
				xlogger.ErrorfCtx(ctx, "通讯录同步:停用用户失败(%d): %v", op.LocalID, err)
			} else {
				res.UsersDisabled++
			}
		}
	}
}

// syncUpdateUser 更新已绑定用户的资料/部门/状态(复启用)。
func (s *ContactSyncService) syncUpdateUser(ctx context.Context, op UserOp, source, sourceLabel string) error {
	user, err := s.userRepo.GetByID(ctx, op.LocalID)
	if err != nil {
		return fmt.Errorf("用户不存在: %w", err)
	}
	user.Nickname = op.Nickname
	if op.Phone != "" {
		user.Phone = op.Phone
	}
	user.Email = op.Email
	if op.Avatar != "" {
		user.Avatar = op.Avatar
	}
	if op.DeptID != nil {
		user.DeptID = op.DeptID
	}
	if user.Status != 1 {
		user.Status = 1 // 平台仍在职 → 复启用
	}
	user.ExternalID = op.ExternalID
	user.IDSource = source
	return s.userRepo.SyncUpdate(ctx, user)
}

// bindExternalUser 手机号命中既有本地用户:绑定外部 id,不新建。
func (s *ContactSyncService) bindExternalUser(ctx context.Context, op UserOp, source, sourceLabel string) error {
	user, err := s.userRepo.GetByID(ctx, op.LocalID)
	if err != nil {
		return fmt.Errorf("用户不存在: %w", err)
	}
	if user.IDSource != "" && user.IDSource != source && user.ExternalID != "" {
		return fmt.Errorf("用户 %s 已绑定其他平台(%s),不覆盖", user.Username, user.IDSource)
	}
	user.ExternalID = op.ExternalID
	user.IDSource = source
	if user.Nickname == "" && op.Nickname != "" {
		user.Nickname = op.Nickname
	}
	if op.DeptID != nil {
		user.DeptID = op.DeptID
	}
	if user.Remark == "" {
		user.Remark = fmt.Sprintf("来自%s同步(手机号匹配绑定)", sourceLabel)
	}
	if user.Status != 1 {
		user.Status = 1
	}
	return s.userRepo.SyncUpdate(ctx, user)
}

// createUser 新建本地用户(username=手机号或平台前缀,随机初始密码,status=1)。
func (s *ContactSyncService) createUser(ctx context.Context, op UserOp, source string) error {
	randomPwd := randomPassword()
	hashed, err := xcryption.HashPassword(randomPwd)
	if err != nil {
		return fmt.Errorf("初始密码加密失败: %w", err)
	}
	user := &model.SysUser{
		Username:   op.Username,
		Password:   hashed,
		Nickname:   op.Nickname,
		Phone:      op.Phone,
		Email:      op.Email,
		Avatar:     op.Avatar,
		DeptID:     op.DeptID,
		Status:     1,
		ExternalID: op.ExternalID,
		IDSource:   source,
		Remark:     op.Remark,
	}
	if err := s.userRepo.Create(ctx, user); err != nil {
		return err
	}
	// 新用户无角色:仅可登录查看自己的工作台,由管理员按需授权。
	return nil
}

// disableUser 平台消失人员:置停用并踢会话,不硬删(有审批/合同引用)。
func (s *ContactSyncService) disableUser(ctx context.Context, id uint) error {
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("用户不存在: %w", err)
	}
	if user.Status == 0 {
		return nil // 已是禁用,幂等
	}
	user.Status = 0
	user.TokenVersion++ // 使旧 JWT 失效
	return s.userRepo.SyncUpdate(ctx, user)
}

// finish 落 audit 日志 + 状态摘要。
func (s *ContactSyncService) finish(ctx context.Context, res *SyncResult) {
	xlogger.InfofCtx(ctx,
		"通讯录同步完成 platform=%s 部门[新建%d 更新%d 停用%d] 用户[更新%d 绑定%d 新建%d 停用%d] 操作错误%d %s",
		res.Platform, res.DeptsCreated, res.DeptsUpdated, res.DeptsDisabled,
		res.UsersUpdated, res.UsersBound, res.UsersCreated, res.UsersDisabled,
		res.OpErrors, res.Error)
	s.saveStatus(ctx, res)
}

// rootSentinelOf 平台根哨兵(钉钉根部门 dept_id=1;飞书根 parent_department_id=0)。
func rootSentinelOf(source string) string {
	if source == model.IDSourceDingtalk {
		return dingtalk.FormatInt64(dingtalk.RootDeptID)
	}
	return feishu.RootParentID
}

// resolveParentLocal 外部父 id → 本地父部门 id(空/未映射 → 0 顶级)。
func resolveParentLocal(extToLocal map[string]uint, parentExtID string) uint {
	if parentExtID == "" {
		return 0
	}
	if id, ok := extToLocal[parentExtID]; ok {
		return id
	}
	return 0
}

// randomPassword 生成 16 字节随机 hex 初始密码(仅落哈希,明文不记日志)。
func randomPassword() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// cacheStore 包装 cache.GetStore(nil=未初始化)。
func cacheStore() cache.Store { return cache.GetStore() }
