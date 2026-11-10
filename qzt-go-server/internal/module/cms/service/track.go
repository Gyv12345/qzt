package service

import (
	"context"
	"encoding/json"
	"regexp"
	"time"

	cmsmodel "qzt-go-server/internal/model/cms"
	cmsrepo "qzt-go-server/internal/repository/cms"
)

// track.go 官网埋点:公开批量上报 + 管理端聚合统计。

// 事件名只允许字母/数字/下划线,防止脏数据与注入式命名。
var trackEventNameRe = regexp.MustCompile(`^[a-zA-Z0-9_]{1,64}$`)

// propsMaxBytes 扩展属性上限,防止单条事件过大。
const propsMaxBytes = 2048

// TrackService 埋点服务。
type TrackService struct {
	trackRepo *cmsrepo.TrackRepo
}

func NewTrackService() *TrackService {
	return &TrackService{trackRepo: cmsrepo.NewTrackRepo()}
}

// TrackEventInput 单条事件上报。
type TrackEventInput struct {
	Event     string          `json:"event" binding:"required,max=64"`
	Path      string          `json:"path" binding:"max=255"`
	Title     string          `json:"title" binding:"max=255"`
	Referrer  string          `json:"referrer" binding:"max=500"`
	VisitorID string          `json:"visitor_id" binding:"max=64"`
	SessionID string          `json:"session_id" binding:"max=64"`
	Props     json.RawMessage `json:"props"`
}

// TrackIngestRequest 批量上报请求。
type TrackIngestRequest struct {
	Events []TrackEventInput `json:"events" binding:"required,min=1,max=20,dive"`
}

// Ingest 批量落库事件。IP/UA 由服务端从请求上下文取,不信任客户端。
func (s *TrackService) Ingest(ctx context.Context, req *TrackIngestRequest, ip, ua string) (int, error) {
	events := make([]*cmsmodel.CmsTrackEvent, 0, len(req.Events))
	for _, in := range req.Events {
		if !trackEventNameRe.MatchString(in.Event) {
			continue
		}
		var props *string
		if len(in.Props) > 0 {
			// 二次编码:既能校验合法 JSON,又能压掉多余空白;非法则丢弃 props 不拒绝整条。
			var v any
			if err := json.Unmarshal(in.Props, &v); err == nil {
				if b, err := json.Marshal(v); err == nil && len(b) <= propsMaxBytes {
					s := string(b)
					props = &s
				}
			}
		}
		events = append(events, &cmsmodel.CmsTrackEvent{
			Event:     in.Event,
			Path:      truncate(in.Path, 255),
			Title:     truncate(in.Title, 255),
			Referrer:  truncate(in.Referrer, 500),
			VisitorID: truncate(in.VisitorID, 64),
			SessionID: truncate(in.SessionID, 64),
			Props:     props,
			IP:        truncate(ip, 64),
			UA:        truncate(ua, 255),
		})
	}
	if len(events) == 0 {
		return 0, nil
	}
	if err := s.trackRepo.BatchCreate(ctx, events); err != nil {
		return 0, err
	}
	return len(events), nil
}

// TrackSummary 管理端访问统计汇总。
type TrackSummary struct {
	// 统计窗口内 PV
	PV int64 `json:"pv"`
	// 统计窗口内 UV
	UV int64 `json:"uv"`
	// 今日 PV
	TodayPV int64 `json:"today_pv"`
	// 今日 UV
	TodayUV int64 `json:"today_uv"`
	// 昨日 PV
	YesterdayPV int64                  `json:"yesterday_pv"`
	// 昨日 UV
	YesterdayUV int64                  `json:"yesterday_uv"`
	Daily       []cmsrepo.TrackDatePoint `json:"daily"`
	TopPages    []cmsrepo.TrackNameCount `json:"top_pages"`
	TopEvents   []cmsrepo.TrackNameCount `json:"top_events"`
	TopReferrers []cmsrepo.TrackNameCount `json:"top_referrers"`
}

// dayRange 返回 [当日0点, 次日0点)。
func dayRange(t time.Time) (time.Time, time.Time) {
	y, m, d := t.Date()
	start := time.Date(y, m, d, 0, 0, 0, 0, t.Location())
	return start, start.AddDate(0, 0, 1)
}

// Summary 统计近 days 天(含今日)的访问汇总。
func (s *TrackService) Summary(ctx context.Context, days int) (*TrackSummary, error) {
	if days <= 0 || days > 180 {
		days = 7
	}
	now := time.Now()
	todayStart, tomorrowStart := dayRange(now)
	yesterdayStart := todayStart.AddDate(0, 0, -1)
	start := todayStart.AddDate(0, 0, -(days - 1))

	out := &TrackSummary{
		Daily:        make([]cmsrepo.TrackDatePoint, 0, days),
		TopPages:     make([]cmsrepo.TrackNameCount, 0, 10),
		TopEvents:    make([]cmsrepo.TrackNameCount, 0, 10),
		TopReferrers: make([]cmsrepo.TrackNameCount, 0, 10),
	}
	var err error
	if out.PV, out.UV, err = s.trackRepo.CountRange(ctx, start, tomorrowStart); err != nil {
		return nil, err
	}
	if out.TodayPV, out.TodayUV, err = s.trackRepo.CountRange(ctx, todayStart, tomorrowStart); err != nil {
		return nil, err
	}
	if out.YesterdayPV, out.YesterdayUV, err = s.trackRepo.CountRange(ctx, yesterdayStart, todayStart); err != nil {
		return nil, err
	}
	if out.Daily, err = s.trackRepo.DailySeries(ctx, start, tomorrowStart); err != nil {
		return nil, err
	}
	if out.TopPages, err = topOrEmpty(s.trackRepo.TopBy(ctx, "path", start, tomorrowStart, 10)); err != nil {
		return nil, err
	}
	if out.TopEvents, err = topOrEmpty(s.trackRepo.TopBy(ctx, "event", start, tomorrowStart, 10)); err != nil {
		return nil, err
	}
	if out.TopReferrers, err = topOrEmpty(s.trackRepo.TopBy(ctx, "referrer", start, tomorrowStart, 10)); err != nil {
		return nil, err
	}
	return out, nil
}

// topOrEmpty 空结果归一为空切片,JSON 输出 [] 而非 null。
func topOrEmpty(rows []cmsrepo.TrackNameCount, err error) ([]cmsrepo.TrackNameCount, error) {
	if err != nil {
		return nil, err
	}
	if rows == nil {
		return []cmsrepo.TrackNameCount{}, nil
	}
	return rows, nil
}

// List 分页查询原始事件。days 为时间窗口天数(1-180),event 为空则不过滤。
func (s *TrackService) List(ctx context.Context, page, pageSize, days int, event string) ([]cmsmodel.CmsTrackEvent, int64, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	if days <= 0 || days > 180 {
		days = 7
	}
	_, tomorrowStart := dayRange(time.Now())
	start := tomorrowStart.AddDate(0, 0, -days)
	return s.trackRepo.ListPage(ctx, page, pageSize, event, start, tomorrowStart)
}

// truncate 按字节截断(UTF-8 下粗截,rune 越界由 MySQL 宽松模式兜底,服务端先保证上限)。
func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	// 回退到 rune 边界,避免截断出半个多字节字符。
	for max > 0 && (s[max]&0xC0) == 0x80 {
		max--
	}
	return s[:max]
}
