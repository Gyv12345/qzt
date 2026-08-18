package handler

import (
	"slices"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/model"
	errcode "qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

type ResetHandler struct {
	svc *syservice.ResetService
}

func NewResetHandler() *ResetHandler {
	return &ResetHandler{svc: syservice.NewResetService()}
}

// resetRequest 系统重置请求体,confirm 必须为 "RESET" 作为二次确认。
type resetRequest struct {
	Confirm string `json:"confirm"`
}

// ResetBusinessData 一键清理业务数据
// @Summary      清理业务数据
// @Description  超管专用。清表前先删除业务附件对应的存储文件(OSS/本地),再硬删除所有 CRM(客户/线索/商机/合同/跟进/工单)/项目/审批实例/HRM(员工/考勤/薪酬/绩效/候选人)/财务(凭证/发票/应收)/PSI 进销存单据/CMS(文章/页面)/OA(报销/差旅/借款/日程/工作日志/表单数据/会议室预订/消息/公告)及附件与运行日志数据。保留系统配置/字典/权限/组织架构/基础档案,以及知识库/云盘/资产。需 body {confirm:"RESET"} 二次确认。
// @Tags         系统重置
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  resetRequest  true  "确认信息(confirm 必须为 RESET)"
// @Success      200  {object}  xresponse.Response
// @Router       /system/reset [post]
func (h *ResetHandler) ResetBusinessData(c *gin.Context) {
	// 仅超管可执行此高危操作
	if !slices.Contains(middleware.GetRoleCodes(c), model.SuperAdminRoleCode) {
		response.Fail(c, errcode.ErrForbidden, "仅超级管理员可执行系统重置")
		return
	}

	var req resetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if req.Confirm != "RESET" {
		response.Fail(c, errcode.ErrParam, `请传入 confirm:"RESET" 确认重置`)
		return
	}

	if err := h.svc.ResetBusinessData(c.Request.Context()); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"msg": "业务数据已清理"})
}
