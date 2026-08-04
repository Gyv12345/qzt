package errcode

// 业务错误码常量（与 backplane 保持一致的取值，便于前端复用）。
// handler 通过 xresponse.Fail(c, errcode.Xxx, "msg") 返回。
const (
	Success         = 0
	ErrServer       = 10000
	ErrParam        = 10001
	ErrNotFound     = 10002
	ErrUnauthorized = 10003
	ErrForbidden    = 10004

	ErrUserExist     = 20001
	ErrUserNotFound  = 20002
	ErrPasswordWrong = 20003
	ErrUserDisabled  = 20004

	ErrTokenInvalid = 30001
	ErrTokenExpired = 30002

	ErrRoleExist    = 40001
	ErrRoleNotFound = 40002

	ErrMenuNotFound = 50001
)
