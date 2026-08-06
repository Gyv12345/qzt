package service

import (
	"context"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/repository"
)

// LoginLogService 登录日志查询。直接用泛型 BaseRepo[model.SysLoginLog],
// 无需单独定义 LoginLogRepo —— 登录日志只读(由 middleware 写入),无自定义方法。
type LoginLogService struct {
	repo repository.BaseRepo[model.SysLoginLog]
}

func NewLoginLogService() *LoginLogService {
	return &LoginLogService{}
}

// List 分页查询登录日志。等值筛选(username/success/client_ip)放 Where,
// 时间范围用 Conds(>= start, <= end),与 operation_log 同一思路。
func (s *LoginLogService) List(ctx context.Context, page, pageSize int, username, success, clientIP, startDate, endDate string) ([]model.SysLoginLog, int64, error) {
	q := &repository.QueryOptions{
		Where: map[string]interface{}{},
		Order: []string{"id DESC"},
	}
	if username != "" {
		q.Where["username"] = username
	}
	if clientIP != "" {
		q.Where["client_ip"] = clientIP
	}
	if success != "" {
		// success 取值 "true"/"1" 视为成功,其余视为失败
		q.Where["success"] = success == "true" || success == "1"
	}
	if start := parseTimeRange(startDate); !start.IsZero() {
		q.Conds = append(q.Conds, repository.Cond{Query: "created_at >= ?", Args: []interface{}{start}})
	}
	if end := parseTimeRange(endDate); !end.IsZero() {
		q.Conds = append(q.Conds, repository.Cond{Query: "created_at <= ?", Args: []interface{}{end}})
	}
	return s.repo.PageList(ctx, page, pageSize, q)
}
