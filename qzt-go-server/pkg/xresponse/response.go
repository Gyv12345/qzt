package xresponse

import (
	"net/http"
	e "qzt-go-server/pkg/xerror"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	BizCode = "biz_code"
	BizMsg  = "biz_msg"
)

// String 字符串返回
func String(c *gin.Context, res string) {
	c.Set(BizCode, 0)
	c.Set(BizMsg, "")
	c.String(http.StatusOK, res)
}

// Json 统一处理格式，返回包含data
func Json(c *gin.Context, code int, msg string, data any) {
	if data == nil {
		data = struct{}{}
	}
	c.Set(BizCode, code)
	c.Set(BizMsg, msg)
	c.JSON(http.StatusOK, gin.H{
		"code":      code,
		"msg":       msg,
		"data":      data,
		"timestamp": time.Now().UTC().UnixMilli(),
	})
}

// JsonByError 统一处理格式,参数为e.Code类型，data返回
func JsonByError(c *gin.Context, code e.Code, data any) {
	Json(c, code.GetErrCode(), code.GetErrMsg(), data)
}

// Success 成功返回
func Success(c *gin.Context, data any) {
	Json(c, e.OK.GetErrCode(), e.OK.GetErrMsg(), data)
}

// Fail 请求异常返回，只返回code跟msg，不返回data
func Fail(c *gin.Context, errCode int, errMsg string) {
	Json(c, errCode, errMsg, nil)
}

// FailByError 请求异常返回,参数为e.Code类型，只返回code跟msg，不返回data
func FailByError(c *gin.Context, code e.Code) {
	Json(c, code.GetErrCode(), code.GetErrMsg(), nil)
}

// OK 成功返回的简写别名（等价于 Success），便于与既有代码风格对齐。
func OK(c *gin.Context, data any) {
	Success(c, data)
}

// unauthorized 返回 401 并中止后续处理。body 仍是统一信封。
func unauthorized(c *gin.Context, msg string) {
	c.Set(BizCode, e.HttpUnauthorized.GetErrCode())
	c.Set(BizMsg, msg)
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
		"code":      e.HttpUnauthorized.GetErrCode(),
		"msg":       msg,
		"data":      struct{}{},
		"timestamp": time.Now().UTC().UnixMilli(),
	})
}

// Unauthorized 返回 401 未认证。
func Unauthorized(c *gin.Context, msg string) {
	unauthorized(c, msg)
}

// forbidden 返回 403 并中止后续处理。
func forbidden(c *gin.Context, msg string) {
	c.Set(BizCode, e.HttpForbidden.GetErrCode())
	c.Set(BizMsg, msg)
	c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
		"code":      e.HttpForbidden.GetErrCode(),
		"msg":       msg,
		"data":      struct{}{},
		"timestamp": time.Now().UTC().UnixMilli(),
	})
}

// Forbidden 返回 403 无权限。
func Forbidden(c *gin.Context, msg string) {
	forbidden(c, msg)
}

// NotFound 返回 404 资源不存在。
func NotFound(c *gin.Context, msg string) {
	c.Set(BizCode, e.HttpNotFound.GetErrCode())
	c.Set(BizMsg, msg)
	c.AbortWithStatusJSON(http.StatusNotFound, gin.H{
		"code":      e.HttpNotFound.GetErrCode(),
		"msg":       msg,
		"data":      struct{}{},
		"timestamp": time.Now().UTC().UnixMilli(),
	})
}

// Response 统一响应信封,供 swagger 文档引用(实际序列化由 Json/OK 等用 gin.H 完成,
// 字段与此结构一致)。注解中用 xresponse.Response{data=具体类型} 表达返回结构。
type Response struct {
	// 业务状态码(0=成功,非0=错误码)
	Code int `json:"code" example:"0"`
	// 提示信息(成功为 success,错误为错误描述)
	Msg string `json:"msg" example:"success"`
	// 业务数据(具体类型由各接口决定)
	Data any `json:"data"`
	// 服务器时间戳(秒)
	Timestamp int64 `json:"timestamp"`
}
