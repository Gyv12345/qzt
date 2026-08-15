package pagination

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// pagination.go 通用分页参数解析(全模块共用)。
// 原实现分散在 internal/module/system/service/pagination.go 与
// internal/module/cms/service/pagination.go(两份一字不差的复制),
// 现统一迁到此处;旧位置保留 re-export 以兼容既有调用方。

const maxPage = 10000

// Pagination 分页参数与总数。page 从 1 开始；page_size 钳制在 [1,100]。
type Pagination struct {
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
	Total    int64 `json:"total"`
}

// GetPagination 从查询参数 page / page_size 解析分页，带默认值与上下界钳制。
func GetPagination(c *gin.Context) Pagination {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	if page < 1 {
		page = 1
	}
	if page > maxPage {
		page = maxPage
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	return Pagination{Page: page, PageSize: pageSize}
}
