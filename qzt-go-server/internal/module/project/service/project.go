package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	projmodel "qzt-go-server/internal/model/project"
	"qzt-go-server/internal/pkg/numbergen"
	projrepo "qzt-go-server/internal/repository/project"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// project.go 项目+任务服务。

func notFoundOrProj(err error, msg string) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errors.New(msg)
	}
	return err
}

type ProjectService struct {
	repo     *projrepo.ProjectRepo
	taskRepo *projrepo.TaskRepo
}

func NewProjectService() *ProjectService {
	return &ProjectService{repo: projrepo.NewProjectRepo(), taskRepo: projrepo.NewTaskRepo()}
}

// ── 项目 ──

type CreateProjectRequest struct {
	Name         string `json:"name" binding:"required"`
	Description  string `json:"description"`
	CustomerID   *uint  `json:"customer_id"`
	CustomerName string `json:"customer_name"`
	ContractID   *uint  `json:"contract_id"`
	ManagerID    *uint  `json:"manager_id"`
	MemberIDs    string `json:"member_ids"`
	Priority     int8   `json:"priority"`
	StartDate    string `json:"start_date"`
	EndDate      string `json:"end_date"`
	Tags         string `json:"tags"`
}

func (s *ProjectService) Create(ctx context.Context, req *CreateProjectRequest) (*projmodel.ProjProject, error) {
	no, _ := numbergen.Generate(ctx, "project")
	p := &projmodel.ProjProject{
		ProjectNo:   no,
		Name:        req.Name,
		Description: req.Description,
		CustomerID:  req.CustomerID,
		CustomerName: req.CustomerName,
		ContractID:  req.ContractID,
		ManagerID:   req.ManagerID,
		MemberIDs:   req.MemberIDs,
		Status:      projmodel.ProjectStatusPlanning,
		Priority:    req.Priority,
		Tags:        req.Tags,
	}
	if p.Priority == 0 {
		p.Priority = projmodel.PriorityNormal
	}
	if req.StartDate != "" {
		if t, err := time.ParseInLocation("2006-01-02", req.StartDate, time.Local); err == nil {
			p.StartDate = xtime.NewDateTime(t)
		}
	}
	if req.EndDate != "" {
		if t, err := time.ParseInLocation("2006-01-02", req.EndDate, time.Local); err == nil {
			p.EndDate = xtime.NewNullDateTimeFromTime(t)
		}
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *ProjectService) List(ctx context.Context, page, pageSize int, keyword string, status, priority int8, managerID uint) ([]projmodel.ProjProject, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, keyword, status, priority, managerID)
}

func (s *ProjectService) GetByID(ctx context.Context, id uint) (*projmodel.ProjectDetail, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, notFoundOrProj(err, "项目不存在")
	}
	tasks, err := s.taskRepo.ListByProject(ctx, id)
	if err != nil {
		return nil, err
	}
	return &projmodel.ProjectDetail{Project: *p, Tasks: tasks}, nil
}

type UpdateProjectRequest struct {
	Name         string `json:"name" binding:"required"`
	Description  string `json:"description"`
	CustomerID   *uint  `json:"customer_id"`
	CustomerName string `json:"customer_name"`
	ContractID   *uint  `json:"contract_id"`
	ManagerID    *uint  `json:"manager_id"`
	MemberIDs    string `json:"member_ids"`
	Status       int8   `json:"status"`
	Priority     int8   `json:"priority"`
	StartDate    string `json:"start_date"`
	EndDate      string `json:"end_date"`
	Progress     int8   `json:"progress"`
	Tags         string `json:"tags"`
}

func (s *ProjectService) Update(ctx context.Context, id uint, req *UpdateProjectRequest) error {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOrProj(err, "项目不存在")
	}
	p.Name = req.Name
	p.Description = req.Description
	p.CustomerID = req.CustomerID
	p.CustomerName = req.CustomerName
	p.ContractID = req.ContractID
	p.ManagerID = req.ManagerID
	p.MemberIDs = req.MemberIDs
	if req.Status > 0 {
		p.Status = req.Status
	}
	if req.Priority > 0 {
		p.Priority = req.Priority
	}
	p.Progress = req.Progress
	p.Tags = req.Tags
	if req.StartDate != "" {
		if t, err := time.ParseInLocation("2006-01-02", req.StartDate, time.Local); err == nil {
			p.StartDate = xtime.NewDateTime(t)
		}
	}
	if req.EndDate != "" {
		if t, err := time.ParseInLocation("2006-01-02", req.EndDate, time.Local); err == nil {
			p.EndDate = xtime.NewNullDateTimeFromTime(t)
		}
	}
	return s.repo.Update(ctx, p)
}

func (s *ProjectService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return notFoundOrProj(err, "项目不存在")
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.taskRepo.DeleteByProject(ctx, id); err != nil {
			return err
		}
		return s.repo.Delete(ctx, id)
	})
}

// ── 任务 ──

type CreateTaskRequest struct {
	ProjectID   uint   `json:"project_id" binding:"required"`
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	AssigneeID  *uint  `json:"assignee_id"`
	Priority    int8   `json:"priority"`
	DueDate     string `json:"due_date"`
}

func (s *ProjectService) CreateTask(ctx context.Context, req *CreateTaskRequest) (*projmodel.ProjTask, error) {
	if _, err := s.repo.GetByID(ctx, req.ProjectID); err != nil {
		return nil, notFoundOrProj(err, "项目不存在")
	}
	t := &projmodel.ProjTask{
		ProjectID:   req.ProjectID,
		Title:       req.Title,
		Description: req.Description,
		AssigneeID:  req.AssigneeID,
		Status:      projmodel.TaskStatusTodo,
		Priority:    req.Priority,
	}
	if t.Priority == 0 {
		t.Priority = projmodel.PriorityNormal
	}
	if req.DueDate != "" {
		if t2, err := time.ParseInLocation("2006-01-02", req.DueDate, time.Local); err == nil {
			t.DueDate = xtime.NewNullDateTimeFromTime(t2)
		}
	}
	if err := s.taskRepo.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *ProjectService) ListTasks(ctx context.Context, projectID uint) ([]projmodel.ProjTask, error) {
	return s.taskRepo.ListByProject(ctx, projectID)
}

type UpdateTaskRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	AssigneeID  *uint  `json:"assignee_id"`
	Status      int8   `json:"status"`
	Priority    int8   `json:"priority"`
	SortOrder   int    `json:"sort_order"`
	DueDate     string `json:"due_date"`
}

func (s *ProjectService) UpdateTask(ctx context.Context, id uint, req *UpdateTaskRequest) error {
	t, err := s.taskRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOrProj(err, "任务不存在")
	}
	t.Title = req.Title
	t.Description = req.Description
	t.AssigneeID = req.AssigneeID
	if req.Status > 0 {
		oldStatus := t.Status
		t.Status = req.Status
		// 完成时记录完成时间
		if req.Status == projmodel.TaskStatusDone && oldStatus != projmodel.TaskStatusDone {
			t.DoneAt = xtime.NewNullDateTimeFromTime(time.Now())
		}
		// 取消完成时清除
		if req.Status != projmodel.TaskStatusDone {
			t.DoneAt = xtime.NullDateTime{}
		}
	}
	if req.Priority > 0 {
		t.Priority = req.Priority
	}
	t.SortOrder = req.SortOrder
	if req.DueDate != "" {
		if t2, err := time.ParseInLocation("2006-01-02", req.DueDate, time.Local); err == nil {
			t.DueDate = xtime.NewNullDateTimeFromTime(t2)
		}
	}
	return s.taskRepo.Update(ctx, t)
}

// UpdateTaskStatus 快捷更新任务状态(看板拖拽用)。
func (s *ProjectService) UpdateTaskStatus(ctx context.Context, id uint, status int8) error {
	t, err := s.taskRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOrProj(err, "任务不存在")
	}
	oldStatus := t.Status
	t.Status = status
	if status == projmodel.TaskStatusDone && oldStatus != projmodel.TaskStatusDone {
		t.DoneAt = xtime.NewNullDateTimeFromTime(time.Now())
	}
	if status != projmodel.TaskStatusDone {
		t.DoneAt = xtime.NullDateTime{}
	}
	return s.taskRepo.Update(ctx, t)
}

func (s *ProjectService) DeleteTask(ctx context.Context, id uint) error {
	if _, err := s.taskRepo.GetByID(ctx, id); err != nil {
		return notFoundOrProj(err, "任务不存在")
	}
	return s.taskRepo.Delete(ctx, id)
}

// 初始化:注册编号规则
func init() {
	numbergen.Register("project", numbergen.Rule{
		Enabled: true, Prefix: "XM", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: func(ctx context.Context, prefix, datePart string) (int64, error) {
			var n int64
			err := repository.DBFrom(ctx).Model(&projmodel.ProjProject{}).
				Where("project_no LIKE ?", prefix+datePart+"%").
				Count(&n).Error
			return n, err
		},
	})
	// 避免 unused
	_ = fmt.Sprintf
}
