package service

import (
	"context"
	"errors"

	mktmodel "qzt-go-server/internal/model/marketing"
	mktrepo "qzt-go-server/internal/repository/marketing"
)

// log.go 线索同步日志服务(管理端查询)。

// LogService 同步日志服务。
type LogService struct {
	repo *mktrepo.LeadLogRepo
}

func NewLogService() *LogService {
	return &LogService{repo: mktrepo.NewLeadLogRepo()}
}

// List 分页查询同步日志(账号/状态/关键词/创建时间窗)。
func (s *LogService) List(ctx context.Context, page, pageSize int, accountID uint, status int8, keyword, startTime, endTime string) ([]mktmodel.MarketingLeadLog, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, accountID, status, keyword, startTime, endTime)
}

// GetByID 日志详情(含原始报文)。
func (s *LogService) GetByID(ctx context.Context, id uint) (*mktmodel.MarketingLeadLog, error) {
	log, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("日志不存在")
	}
	return log, nil
}
