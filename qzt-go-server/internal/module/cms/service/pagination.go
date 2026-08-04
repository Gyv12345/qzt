package service

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

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
