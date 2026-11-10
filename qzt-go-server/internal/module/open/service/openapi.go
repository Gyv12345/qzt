// openapi.go 开放 API(/open/v1/*)服务:事件目录 + 组织树同步。
package service

import (
	"context"

	hrmmodel "qzt-go-server/internal/model/hrm"
	hrmsvc "qzt-go-server/internal/module/hrm/service"
)

// OpenAPIService 开放 API 服务。
type OpenAPIService struct{}

func NewOpenAPIService() *OpenAPIService { return &OpenAPIService{} }

// Events 事件目录(开放端点返回给外部/OA 系统的目录契约)。
func (s *OpenAPIService) Events() []EventInfo { return EventCatalog }

// OrgTree 组织树(hrm 部门树透出,供 OA 系统同步)。
func (s *OpenAPIService) OrgTree(ctx context.Context) ([]hrmmodel.HrmDepartment, error) {
	return hrmsvc.NewDepartmentService().Tree(ctx)
}
