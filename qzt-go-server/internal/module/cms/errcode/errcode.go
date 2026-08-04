package errcode

// errcode.go CMS 模块业务错误码。
// 系统模块使用 1xxxx-5xxxx，CRM 暂未定义 HTTP 层错误码；CMS 使用 6xxxx 段。

const (
	Success = 0

	// 通用(60000-60099)
	ErrServer   = 60000
	ErrParam    = 60001
	ErrNotFound = 60002

	// 分类(60100-60199)
	ErrCategoryNotFound    = 60101
	ErrCategoryHasChildren = 60102
	ErrCategoryHasArticles = 60103

	// 标签(60200-60299)
	ErrTagNotFound = 60201

	// 文章(60300-60399)
	ErrArticleNotFound = 60301

	// 单页(60400-60499)
	ErrPageNotFound = 60401

	// 唯一性冲突(60900-60999)
	ErrSlugExists = 60901
)
