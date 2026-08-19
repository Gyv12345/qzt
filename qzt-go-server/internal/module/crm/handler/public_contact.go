package handler

import (
	"context"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/pkg/notify"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	response "qzt-go-server/pkg/xresponse"
	"qzt-go-server/pkg/xlogger"
)

// public_contact.go 官网公开留言 → CRM 线索(入公海) + 推送通知。
// 无需鉴权,任何人都能提交;线索落入公海池等待销售领取。

// PublicContactRequest 官网留言表单。
type PublicContactRequest struct {
	Name    string `json:"name" binding:"required,max=50"`
	Phone   string `json:"phone" binding:"required,max=30"`
	Email   string `json:"email" binding:"max=100"`
	Company string `json:"company" binding:"max=100"`
	Message string `json:"message" binding:"required,max=1000"`
}

// PublicContact 处理官网留言,创建线索(入公海) + 推送通知。
// @Summary  官网留言提交
// @Description  公开接口,创建线索到公海池并通知管理员
// @Tags     公共接口
// @Accept   json
// @Produce  json
// @Param    body  body  PublicContactRequest  true  "留言内容"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/public/contact [post]
func (h *LeadHandler) PublicContact(c *gin.Context) {
	// 频率限制:同一 IP 每分钟最多 3 次
	ip := c.ClientIP()
	rateKey := "contact:rate:" + ip
	count, _ := cache.GetStore().Incr(rateKey)
	if count == 1 {
		cache.GetStore().Expire(rateKey, time.Minute)
	}
	if count > 3 {
		response.Fail(c, errcode.ErrParam, "提交过于频繁,请稍后再试")
		return
	}

	var req PublicContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "请填写姓名、电话和留言内容")
		return
	}

	ctx := c.Request.Context()

	// 生成线索编号
	leadNo, _ := numbergen.Generate(ctx, "lead")

	// 构建线索名称:有公司名时 "公司-姓名",否则直接用姓名
	leadName := req.Name
	if req.Company != "" {
		leadName = req.Company + "-" + req.Name
	}

	// 构建线索(入公海,无负责人)
	lead := &crmmodel.CrmLead{
		Name:        leadName,
		LeadNo:      leadNo,
		ContactName: req.Name,
		Phone:       req.Phone,
		Email:       req.Email,
		Company:     req.Company,
		Source:      "官网留言",
		Status:      crmmodel.LeadStatusNew,
		InPool:      crmmodel.InPoolPublic,
		Remark:      req.Message,
	}

	if err := repository.DBFrom(ctx).Create(lead).Error; err != nil {
		xlogger.ErrorfCtx(ctx, "官网留言创建线索失败: %v", err)
		response.Fail(c, errcode.ErrServer, "提交失败,请稍后重试")
		return
	}

	// 异步推送通知给超管用户
	go notifyAdminsNewLead(lead)

	response.OK(c, gin.H{"lead_no": lead.LeadNo})
}

// notifyAdminsNewLead 通知超管用户有新官网线索。
func notifyAdminsNewLead(lead *crmmodel.CrmLead) {
	ctx := context.Background()

	// 查询超管角色用户 ID(sys_user_role 真实列名是 sys_user_id/sys_role_id)
	var userIDs []uint
	err := repository.DBFrom(ctx).
		Table("sys_user_role AS ur").
		Joins("JOIN sys_role AS r ON r.id = ur.sys_role_id").
		Joins("JOIN sys_user AS u ON u.id = ur.sys_user_id").
		Where("r.code = ? AND u.status = 1 AND u.deleted_at IS NULL", "super_admin").
		Pluck("ur.sys_user_id", &userIDs).Error
	if err != nil || len(userIDs) == 0 {
		return
	}

	title := "📢 新官网线索"
	content := fmt.Sprintf("%s(%s)提交了留言,请前往线索池领取", lead.Name, lead.Phone)
	for _, uid := range userIDs {
		notify.Dispatch(ctx, uid, title, content, "/crm/lead-pool")
	}
}
