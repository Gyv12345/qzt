package hrm

import (
	"context"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
)

// payroll_v2.go 社保方案/工资项 repository(P16)。

type InsurancePlanRepo struct {
	repository.BaseRepo[hrmmodel.HrmInsurancePlan]
}

func NewInsurancePlanRepo() *InsurancePlanRepo { return &InsurancePlanRepo{} }

// ListEnabled 启用中的方案(admin 下拉与生成时取用)。
func (r *InsurancePlanRepo) ListEnabled(ctx context.Context) ([]hrmmodel.HrmInsurancePlan, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"status": 1},
		Order: []string{"id ASC"},
	})
}

type SalaryItemRepo struct {
	repository.BaseRepo[hrmmodel.HrmSalaryItem]
}

func NewSalaryItemRepo() *SalaryItemRepo { return &SalaryItemRepo{} }

// ListEnabled 启用中的工资项(按 sort 升序=求值顺序)。
func (r *SalaryItemRepo) ListEnabled(ctx context.Context) ([]hrmmodel.HrmSalaryItem, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"status": 1},
		Order: []string{"sort ASC, id ASC"},
	})
}
