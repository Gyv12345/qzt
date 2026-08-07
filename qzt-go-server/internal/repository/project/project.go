package project

import (
	"context"

	"gorm.io/gorm"

	projmodel "qzt-go-server/internal/model/project"
	"qzt-go-server/internal/repository"
)

// project.go 项目+任务 repository。

func projDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }

// ── 项目 ──

type ProjectRepo struct {
	repository.BaseRepo[projmodel.ProjProject]
}

func NewProjectRepo() *ProjectRepo { return &ProjectRepo{} }

func (r *ProjectRepo) PageList(ctx context.Context, page, pageSize int, keyword string, status, priority int8, managerID uint) ([]projmodel.ProjProject, int64, error) {
	var list []projmodel.ProjProject
	q := projDB(ctx).Model(&projmodel.ProjProject{})
	if keyword != "" {
		q = q.Where("name LIKE ? OR project_no LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	if priority > 0 {
		q = q.Where("priority = ?", priority)
	}
	if managerID > 0 {
		q = q.Where("manager_id = ?", managerID)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *ProjectRepo) Update(ctx context.Context, m *projmodel.ProjProject) error {
	return r.BaseRepo.Update(ctx, m, "Name", "Description", "CustomerID", "CustomerName", "ContractID", "ManagerID", "MemberIDs", "Status", "Priority", "StartDate", "EndDate", "Progress", "Tags")
}

// ── 任务 ──

type TaskRepo struct {
	repository.BaseRepo[projmodel.ProjTask]
}

func NewTaskRepo() *TaskRepo { return &TaskRepo{} }

func (r *TaskRepo) ListByProject(ctx context.Context, projectID uint) ([]projmodel.ProjTask, error) {
	var list []projmodel.ProjTask
	err := projDB(ctx).Where("project_id = ?", projectID).Order("sort_order ASC, id ASC").Find(&list).Error
	return list, err
}

func (r *TaskRepo) DeleteByProject(ctx context.Context, projectID uint) error {
	return projDB(ctx).Where("project_id = ?", projectID).Delete(&projmodel.ProjTask{}).Error
}

func (r *TaskRepo) Update(ctx context.Context, m *projmodel.ProjTask) error {
	return r.BaseRepo.Update(ctx, m, "Title", "Description", "AssigneeID", "Status", "Priority", "SortOrder", "DueDate", "DoneAt")
}
