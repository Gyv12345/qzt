package service

import (
	"context"
	"time"

	projmodel "qzt-go-server/internal/model/project"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	projrepo "qzt-go-server/internal/repository/project"
	"qzt-go-server/pkg/xtime"
)

// project.go 项目+任务服务。

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
		ProjectNo:    no,
		Name:         req.Name,
		Description:  req.Description,
		CustomerID:   req.CustomerID,
		CustomerName: req.CustomerName,
		ContractID:   req.ContractID,
		ManagerID:    req.ManagerID,
		MemberIDs:    req.MemberIDs,
		Status:       projmodel.ProjectStatusPlanning,
		Priority:     req.Priority,
		Tags:         req.Tags,
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
		return nil, repository.NotFoundOr(err, "项目不存在")
	}
	tasks, err := s.taskRepo.ListByProject(ctx, id)
	if err != nil {
		return nil, err
	}
	return &projmodel.ProjectDetail{Project: *p, Tasks: tasks}, nil
}

type UpdateProjectRequest struct {
	Name         string `json:"name"` // 留空=不修改(支持仅改状态的部分更新)
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
		return repository.NotFoundOr(err, "项目不存在")
	}
	if req.Name != "" {
		p.Name = req.Name
	}
	if req.Description != "" {
		p.Description = req.Description
	}
	if req.CustomerID != nil {
		p.CustomerID = req.CustomerID
	}
	if req.CustomerName != "" {
		p.CustomerName = req.CustomerName
	}
	if req.ContractID != nil {
		p.ContractID = req.ContractID
	}
	if req.ManagerID != nil {
		p.ManagerID = req.ManagerID
	}
	if req.MemberIDs != "" {
		p.MemberIDs = req.MemberIDs
	}
	if req.Status > 0 {
		p.Status = req.Status
	}
	if req.Priority > 0 {
		p.Priority = req.Priority
	}
	if req.Progress > 0 {
		p.Progress = req.Progress
	}
	if req.Tags != "" {
		p.Tags = req.Tags
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
	return s.repo.Update(ctx, p)
}

func (s *ProjectService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return repository.NotFoundOr(err, "项目不存在")
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
	// 甘特图字段:开始日期("2006-01-02",可空)/进度(0-100)/里程碑标志(0普通1里程碑)
	StartDate   string `json:"start_date"`
	Progress    int    `json:"progress"`
	IsMilestone int8   `json:"is_milestone"`
}

func (s *ProjectService) CreateTask(ctx context.Context, req *CreateTaskRequest) (*projmodel.ProjTask, error) {
	if _, err := s.repo.GetByID(ctx, req.ProjectID); err != nil {
		return nil, repository.NotFoundOr(err, "项目不存在")
	}
	t := &projmodel.ProjTask{
		ProjectID:   req.ProjectID,
		Title:       req.Title,
		Description: req.Description,
		AssigneeID:  req.AssigneeID,
		Status:      projmodel.TaskStatusTodo,
		Priority:    req.Priority,
		Progress:    clampProgress(req.Progress),
		IsMilestone: req.IsMilestone,
	}
	if t.Priority == 0 {
		t.Priority = projmodel.PriorityNormal
	}
	if req.DueDate != "" {
		if t2, err := time.ParseInLocation("2006-01-02", req.DueDate, time.Local); err == nil {
			t.DueDate = xtime.NewNullDateTimeFromTime(t2)
		}
	}
	if req.StartDate != "" {
		if t2, err := time.ParseInLocation("2006-01-02", req.StartDate, time.Local); err == nil {
			t.StartDate = xtime.NewNullDateTimeFromTime(t2)
		}
	}
	if err := s.taskRepo.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

// clampProgress 把进度收敛到 0-100。
func clampProgress(p int) int {
	if p < 0 {
		return 0
	}
	if p > 100 {
		return 100
	}
	return p
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
	// 甘特图字段(半增量,指针区分未传/传值):
	// StartDate nil=未传不覆盖;""=清空;其余按 "2006-01-02" 解析
	StartDate *string `json:"start_date"`
	// Progress nil=未传不覆盖;允许回设 0
	Progress *int `json:"progress"`
	// IsMilestone nil=未传不覆盖;0=取消里程碑,1=设为里程碑
	IsMilestone *int8 `json:"is_milestone"`
}

func (s *ProjectService) UpdateTask(ctx context.Context, id uint, req *UpdateTaskRequest) error {
	t, err := s.taskRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "任务不存在")
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
	if req.StartDate != nil {
		if *req.StartDate == "" {
			t.StartDate = xtime.NullDateTime{} // 显式清空
		} else if t2, err := time.ParseInLocation("2006-01-02", *req.StartDate, time.Local); err == nil {
			t.StartDate = xtime.NewNullDateTimeFromTime(t2)
		}
	}
	if req.Progress != nil {
		t.Progress = clampProgress(*req.Progress)
	}
	if req.IsMilestone != nil {
		t.IsMilestone = *req.IsMilestone
	}
	return s.taskRepo.Update(ctx, t)
}

// UpdateTaskStatus 快捷更新任务状态(看板拖拽用)。
func (s *ProjectService) UpdateTaskStatus(ctx context.Context, id uint, status int8) error {
	t, err := s.taskRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "任务不存在")
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
		return repository.NotFoundOr(err, "任务不存在")
	}
	return s.taskRepo.Delete(ctx, id)
}

// 初始化:注册编号规则
func init() {
	numbergen.Register("project", numbergen.Rule{
		Enabled: true, Prefix: "XM", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: func(ctx context.Context, prefix, datePart string) (int64, error) {
			return projrepo.NewProjectRepo().CountByNoPrefix(ctx, prefix+datePart)
		},
	})
}
