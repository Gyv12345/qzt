package service

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/pkg/pagination"
)

// pagination.go 通用分页解析的兼容 re-export。
// 真正的实现已迁至 internal/pkg/pagination(全模块公共逻辑归位);
// 此处保留同名导出,使既有的 50+ 处跨模块调用方(syservice.GetPagination)
// 无需改动。新增代码请直接 import "qzt-go-server/internal/pkg/pagination"。

// Pagination 分页参数与总数。见 internal/pkg/pagination.Pagination。
type Pagination = pagination.Pagination

// GetPagination 从查询参数 page / page_size 解析分页。
// 见 internal/pkg/pagination.GetPagination。
func GetPagination(c *gin.Context) Pagination { return pagination.GetPagination(c) }
