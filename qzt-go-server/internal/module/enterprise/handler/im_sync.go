package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/enterprise/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// ContactSyncHandler 通讯录同步(钉钉/飞书)手动触发与状态查询。
// 挂 RBAC 保护组(超管直通;其他角色经「第三方应用」页同步按钮授权)。
type ContactSyncHandler struct {
	svc *service.ContactSyncService
}

func NewContactSyncHandler() *ContactSyncHandler {
	return &ContactSyncHandler{svc: service.NewContactSyncService()}
}

// TriggerDingtalk 手动触发钉钉通讯录同步
// @Summary      手动触发钉钉通讯录同步
// @Description  全量对账:部门树+用户 upsert(幂等,消失置停用不硬删)。同步执行并返回统计。需先在「第三方应用」启用钉钉。
// @Tags         通讯录同步
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response{data=object{platform=string,finished_at=string,depts_created=int,depts_updated=int,depts_disabled=int,users_updated=int,users_bound=int,users_created=int,users_disabled=int,op_errors=int,error=string}}
// @Router       /enterprise/contact-sync/dingtalk [post]
func (h *ContactSyncHandler) TriggerDingtalk(c *gin.Context) {
	h.trigger(c, "dingtalk")
}

// TriggerFeishu 手动触发飞书通讯录同步
// @Summary      手动触发飞书通讯录同步
// @Description  全量对账:部门树+用户 upsert(幂等,消失置停用不硬删)。同步执行并返回统计。需先在「第三方应用」启用飞书。
// @Tags         通讯录同步
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response{data=object{platform=string,finished_at=string,depts_created=int,depts_updated=int,depts_disabled=int,users_updated=int,users_bound=int,users_created=int,users_disabled=int,op_errors=int,error=string}}
// @Router       /enterprise/contact-sync/feishu [post]
func (h *ContactSyncHandler) TriggerFeishu(c *gin.Context) {
	h.trigger(c, "feishu")
}

func (h *ContactSyncHandler) trigger(c *gin.Context, platform string) {
	res, err := h.svc.Sync(c.Request.Context(), platform)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, res)
}

// StatusDingtalk 钉钉同步状态
// @Summary      钉钉通讯录同步状态
// @Description  返回最近一次钉钉同步统计摘要(定时/手动共用)。
// @Tags         通讯录同步
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response{data=object{platform=string,finished_at=string,depts_created=int,depts_updated=int,depts_disabled=int,users_updated=int,users_bound=int,users_created=int,users_disabled=int,op_errors=int,error=string}}
// @Router       /enterprise/contact-sync/dingtalk/status [get]
func (h *ContactSyncHandler) StatusDingtalk(c *gin.Context) {
	h.status(c, "dingtalk")
}

// StatusFeishu 飞书同步状态
// @Summary      飞书通讯录同步状态
// @Description  返回最近一次飞书同步统计摘要(定时/手动共用)。
// @Tags         通讯录同步
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response{data=object{platform=string,finished_at=string,depts_created=int,depts_updated=int,depts_disabled=int,users_updated=int,users_bound=int,users_created=int,users_disabled=int,op_errors=int,error=string}}
// @Router       /enterprise/contact-sync/feishu/status [get]
func (h *ContactSyncHandler) StatusFeishu(c *gin.Context) {
	h.status(c, "feishu")
}

func (h *ContactSyncHandler) status(c *gin.Context, platform string) {
	res, err := h.svc.GetLastStatus(c.Request.Context(), platform)
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, res)
}
