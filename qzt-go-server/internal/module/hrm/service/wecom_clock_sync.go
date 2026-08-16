package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	wecom "qzt-go-server/internal/pkg/wecom"
	"qzt-go-server/internal/model"
	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
	hrmrepo "qzt-go-server/internal/repository/hrm"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xtime"
)

// wecom_clock_sync.go 企微打卡数据同步。
//
// 拉取企微「打卡应用」的打卡记录(checkin/getcheckindata),按
// 企微userid → sys_user.wecom_user_id → hrm_employee.user_id → employee_id
// 映射后,幂等写入本地 hrm_attendance_clock(source=WECOM)。
//
// 注意:企微打卡用独立 Secret(非通讯录/自建应用 Secret),配置在
// sys_oauth_config.extra 的 checkin_secret 字段。access_token 按 secret 隔离缓存。

// WecomClockSyncService 企微打卡同步服务。
type WecomClockSyncService struct {
	oauthRepo *repository.OauthConfigRepo
	clockRepo *hrmrepo.AttendanceClockRepo
}

func NewWecomClockSyncService() *WecomClockSyncService {
	return &WecomClockSyncService{
		oauthRepo: repository.NewOauthConfigRepo(),
		clockRepo: hrmrepo.NewAttendanceClockRepo(),
	}
}

// SyncWecomClock 同步企微打卡记录到本地(最近 6 小时窗口,幂等 upsert)。
func (s *WecomClockSyncService) SyncWecomClock(ctx context.Context) error {
	// 1. 读企微配置 + 解析 checkin_secret
	cfg, err := s.oauthRepo.GetByProvider(ctx, model.OAuthProviderWecom)
	if err != nil {
		xlogger.InfofCtx(ctx, "企微打卡同步:未配置企微,跳过 (%v)", err)
		return nil
	}
	var extra struct {
		CheckinSecret string `json:"checkin_secret"`
	}
	if cfg.Extra != "" {
		_ = json.Unmarshal([]byte(cfg.Extra), &extra)
	}
	if extra.CheckinSecret == "" {
		xlogger.InfofCtx(ctx, "企微打卡同步:extra 未配置 checkin_secret,跳过")
		return nil
	}

	// 2. 建映射 wecomUserID → employeeID(跨表查询收口在 repository/hrm)
	wecomToEmp, err := hrmrepo.WecomEmpMap(ctx)
	if err != nil {
		return fmt.Errorf("构建企微→员工映射失败: %w", err)
	}
	if len(wecomToEmp) == 0 {
		xlogger.InfofCtx(ctx, "企微打卡同步:无绑定企微账号的员工,跳过")
		return nil
	}

	// 3. 构造打卡专用 client(checkin_secret,token 自动按 secret 隔离缓存)
	client := wecom.NewClient(wecom.Config{CorpID: cfg.AppID, Secret: extra.CheckinSecret})

	// 4. 时间窗口:最近 6 小时(每小时跑,6h 冗余 + upsert 幂等)
	now := time.Now()
	startTs := now.Add(-6 * time.Hour).Unix()
	endTs := now.Unix()

	// 5. 分批 ≤100 拉取(企微限制)
	allUserIDs := make([]string, 0, len(wecomToEmp))
	for uid := range wecomToEmp {
		allUserIDs = append(allUserIDs, uid)
	}

	synced := 0
	for i := 0; i < len(allUserIDs); i += 100 {
		end := i + 100
		if end > len(allUserIDs) {
			end = len(allUserIDs)
		}
		records, gerr := client.GetCheckinData(ctx, 3, startTs, endTs, allUserIDs[i:end]) // 3=全部类型
		if gerr != nil {
			xlogger.ErrorfCtx(ctx, "企微打卡同步:拉取批次失败(%d-%d): %v", i, end, gerr)
			continue // 某批失败不影响其他批
		}
		for _, r := range records {
			if uerr := s.upsertClock(ctx, r, wecomToEmp); uerr != nil {
				xlogger.ErrorfCtx(ctx, "企微打卡同步:写入失败(userid=%s): %v", r.UserID, uerr)
			} else {
				synced++
			}
		}
	}
	xlogger.InfofCtx(ctx, "企微打卡同步完成:共同步 %d 条", synced)
	return nil
}

// upsertClock 企微打卡记录写入(幂等:employee_id+date+type 查重)。用企微时间戳,不用 now()。
func (s *WecomClockSyncService) upsertClock(ctx context.Context, r wecom.CheckinRecord, wecomToEmp map[string]uint) error {
	empID, ok := wecomToEmp[r.UserID]
	if !ok {
		return nil // 未关联本地员工,跳过
	}
	// checkin_type 映射:上班打卡→CHECK_IN / 下班打卡→CHECK_OUT,其他丢弃
	var clockType string
	switch r.CheckinType {
	case "上班打卡":
		clockType = hrmmodel.ClockTypeCheckIn
	case "下班打卡":
		clockType = hrmmodel.ClockTypeCheckOut
	default:
		return nil // 外出打卡等本系统不处理
	}
	if r.CheckinTime == 0 {
		return nil
	}
	t := time.Unix(r.CheckinTime, 0)
	date := xtime.NewDateTime(time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location()))

	clock := &hrmmodel.HrmAttendanceClock{
		EmployeeID: empID,
		ClockDate:  date,
		ClockType:  clockType,
		ClockTime:  xtime.NewDateTime(t),
		Location:   r.LocationTitle,
		Remark:     "企微同步",
		Source:     hrmmodel.ClockSourceWecom,
	}

	// 查重(代码层 upsert,表无 DB 唯一索引;查询出错沿袭原语义:走创建)
	if existing, err := s.clockRepo.GetByEmpDateType(ctx, empID, date, clockType); err == nil {
		clock.ID = existing.ID
		return s.clockRepo.Update(ctx, clock)
	}
	return s.clockRepo.Create(ctx, clock)
}
