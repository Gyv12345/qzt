package crm

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/crm/handler"
)

// Module CRM 客户关系管理模块。实现 server.Module 接口，注册在 /crm 下。
type Module struct{}

func New() *Module {
	return &Module{}
}

func (m *Module) Name() string {
	return "crm"
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	customerHandler := handler.NewCustomerHandler()
	contactHandler := handler.NewContactHandler()
	opportunityHandler := handler.NewOpportunityHandler()
	contractHandler := handler.NewContractHandler()
	paymentHandler := handler.NewPaymentHandler()
	productHandler := handler.NewProductHandler()
	followHandler := handler.NewFollowHandler()
	poolHandler := handler.NewPoolHandler()
	leadHandler := handler.NewLeadHandler()
	leadPoolHandler := handler.NewLeadPoolHandler()
	customFieldHandler := handler.NewCustomFieldHandler()
	stageHandler := handler.NewStageHandler()
	contractTemplateHandler := handler.NewContractTemplateHandler()
	contractItemHandler := handler.NewContractItemHandler()
	collabHandler := handler.NewCollaborationHandler()
	handoverHandler := handler.NewHandoverHandler()
	changeLogHandler := handler.NewChangeLogHandler()
	importExportHandler := handler.NewImportExportHandler()
	dedupHandler := handler.NewDedupHandler()
	ticketHandler := handler.NewTicketHandler()

	// 公开路由(免鉴权):官网展示用,只读且强制过滤已发布/上架数据。
	public := rg.Group("/public")
	{
		public.GET("/products", productHandler.PublicList)
		public.GET("/products/:id", productHandler.PublicGetByID)
		public.GET("/partners", customerHandler.PublicList)
		public.POST("/contact", leadHandler.PublicContact) // 官网留言 → 线索入公海
	}

	// 已认证路由(仅 JWT,无 RBAC):看板、下拉、时间线、待办、变更历史、回款汇总等查询。
	// 静态路径须先于 :id 注册,避免与参数路由冲突。
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		// 商机看板
		authenticated.GET("/opportunities/board", opportunityHandler.Board)

		// 公海池下拉
		authenticated.GET("/customer-pools/enabled", poolHandler.ListEnabledPools)

		// 线索公海池下拉
		authenticated.GET("/lead-pools/enabled", leadPoolHandler.ListEnabledPools)

		// 跟进记录时间线
		authenticated.GET("/follow-records/timeline", followHandler.Timeline)

		// 我的待办计划
		authenticated.GET("/follow-plans/my-todos", followHandler.MyTodos)

		// 变更历史(查询类)
		authenticated.GET("/customers/:id/owner-history", DataScopeGuard("customer"), customerHandler.OwnerHistory)
		authenticated.GET("/leads/:id/owner-history", DataScopeGuard("lead"), leadHandler.OwnerHistory)
		authenticated.GET("/opportunities/:id/stage-history", DataScopeGuard("opportunity"), opportunityHandler.StageHistory)

		// 合同回款汇总
		authenticated.GET("/contracts/:id/payment-summary", DataScopeGuard("contract"), paymentHandler.PaymentSummary)

		// 字段变更历史(按 biz_type + resource_id 查询)
		authenticated.GET("/field-changes", changeLogHandler.List)

		// 客户/线索查重(录入防重,名称模糊+电话精确)
		authenticated.GET("/dedup", dedupHandler.Check)

		// 跟进预警配置(阈值天数 + 开关,只读)
		authenticated.GET("/followup/warn-config", followHandler.WarnConfig)
	}

	// 受保护路由(JWT + 操作日志 + Casbin RBAC):CRUD 与写操作。
	// OperationLog 位于 auth 与 RBAC 之间,使权限拒绝(403)也被审计。
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		// 客户管理(单记录读写挂 DataScopeGuard,防按 id 越权)
		auth.GET("/customers", customerHandler.List)
		auth.POST("/customers", customerHandler.Create)
		auth.GET("/customers/:id", DataScopeGuard("customer"), customerHandler.GetByID)
		auth.PUT("/customers/:id", DataScopeGuard("customer"), customerHandler.Update)
		auth.DELETE("/customers/:id", DataScopeGuard("customer"), customerHandler.Delete)
		auth.POST("/customers/:id/release", DataScopeGuard("customer"), customerHandler.ReleaseToPool)
		auth.POST("/customers/:id/pick", customerHandler.PickFromPool)
		auth.POST("/customers/:id/transfer", DataScopeGuard("customer"), customerHandler.Transfer)

		// 联系人(子资源:customers/:id/contacts,参数名用 id 与客户路由一致避免 Gin 路由冲突)
		auth.GET("/customers/:id/contacts", DataScopeGuard("customer"), contactHandler.ListByCustomer)
		auth.POST("/customers/:id/contacts", DataScopeGuard("customer"), contactHandler.Create)
		auth.GET("/contacts", contactHandler.ListAll) // 全局联系人列表(独立管理页)
		auth.GET("/contacts/:id", DataScopeGuard("contact"), contactHandler.GetByID)
		auth.PUT("/contacts/:id", DataScopeGuard("contact"), contactHandler.Update)
		auth.DELETE("/contacts/:id", DataScopeGuard("contact"), contactHandler.Delete)

		// 客户团队协作
		auth.GET("/customers/:id/collaborations", DataScopeGuard("customer"), collabHandler.List)
		auth.POST("/customers/:id/collaborations", DataScopeGuard("customer"), collabHandler.Add)
		auth.PUT("/collaborations/:id", DataScopeGuard("collaboration"), collabHandler.Update)
		auth.DELETE("/collaborations/:id", DataScopeGuard("collaboration"), collabHandler.Delete)

		// 离职交接:批量转移用户名下的业务资源
		auth.POST("/handover", handoverHandler.Handover)

		// 导入导出
		auth.GET("/import/template", importExportHandler.DownloadTemplate)
		auth.POST("/import", importExportHandler.Import)

		// 商机管理
		auth.GET("/opportunities", opportunityHandler.List)
		auth.POST("/opportunities", opportunityHandler.Create)
		auth.GET("/opportunities/:id", DataScopeGuard("opportunity"), opportunityHandler.GetByID)
		auth.PUT("/opportunities/:id", DataScopeGuard("opportunity"), opportunityHandler.Update)
		auth.DELETE("/opportunities/:id", DataScopeGuard("opportunity"), opportunityHandler.Delete)
		auth.PUT("/opportunities/:id/stage", DataScopeGuard("opportunity"), opportunityHandler.ChangeStage)

		// 合同管理
		auth.GET("/contracts", contractHandler.List)
		auth.POST("/contracts", contractHandler.Create)
		auth.GET("/contracts/:id", DataScopeGuard("contract"), contractHandler.GetByID)
		auth.PUT("/contracts/:id", DataScopeGuard("contract"), contractHandler.Update)
		auth.DELETE("/contracts/:id", DataScopeGuard("contract"), contractHandler.Delete)
		// 合同套打(选模板渲染)
		auth.GET("/contracts/:id/print-document", DataScopeGuard("contract"), contractTemplateHandler.PrintDocument)

		// 合同模板(静态路径 variables 须先于 :id 注册)
		auth.GET("/contract-templates/variables", contractTemplateHandler.Variables)
		auth.GET("/contract-templates", contractTemplateHandler.List)
		auth.POST("/contract-templates", contractTemplateHandler.Create)
		auth.GET("/contract-templates/:id", contractTemplateHandler.GetByID)
		auth.PUT("/contract-templates/:id", contractTemplateHandler.Update)
		auth.DELETE("/contract-templates/:id", contractTemplateHandler.Delete)

		// 回款计划
		auth.GET("/contracts/:id/payment-plans", DataScopeGuard("contract"), paymentHandler.ListPlansByContract)
		auth.POST("/contracts/:id/payment-plans", DataScopeGuard("contract"), paymentHandler.CreatePlan)
		auth.GET("/payment-plans/:id", DataScopeGuard("payment_plan"), paymentHandler.GetPlan)
		auth.PUT("/payment-plans/:id", DataScopeGuard("payment_plan"), paymentHandler.UpdatePlan)
		auth.DELETE("/payment-plans/:id", DataScopeGuard("payment_plan"), paymentHandler.DeletePlan)

		// 回款记录
		auth.GET("/contracts/:id/payment-records", DataScopeGuard("contract"), paymentHandler.ListRecordsByContract)
		auth.POST("/contracts/:id/payment-records", DataScopeGuard("contract"), paymentHandler.CreateRecord)
		auth.GET("/payment-records/:id", DataScopeGuard("payment_record"), paymentHandler.GetRecord)
		auth.PUT("/payment-records/:id", DataScopeGuard("payment_record"), paymentHandler.UpdateRecord)
		auth.DELETE("/payment-records/:id", DataScopeGuard("payment_record"), paymentHandler.DeleteRecord)

		// 合同产品明细
		auth.GET("/contracts/:id/items", DataScopeGuard("contract"), contractItemHandler.ListByContract)
		auth.POST("/contracts/:id/items", DataScopeGuard("contract"), contractItemHandler.Create)
		auth.PUT("/contract-items/:itemId", DataScopeGuard("contract_item"), contractItemHandler.Update)
		auth.DELETE("/contract-items/:itemId", DataScopeGuard("contract_item"), contractItemHandler.Delete)

		// 产品管理
		auth.GET("/products", productHandler.List)
		auth.POST("/products", productHandler.Create)
		auth.GET("/products/:id", productHandler.GetByID)
		auth.PUT("/products/:id", productHandler.Update)
		auth.DELETE("/products/:id", productHandler.Delete)

		// 售后工单
		auth.GET("/tickets", ticketHandler.List)
		auth.POST("/tickets", ticketHandler.Create)
		auth.GET("/tickets/:id", ticketHandler.GetByID)
		auth.PUT("/tickets/:id", ticketHandler.Update)
		auth.PUT("/tickets/:id/status", ticketHandler.ChangeStatus)
		auth.DELETE("/tickets/:id", ticketHandler.Delete)

		// 跟进记录
		auth.POST("/follow-records", followHandler.CreateRecord)
		auth.GET("/follow-records/:id", DataScopeGuard("follow_record"), followHandler.GetRecord)
		auth.PUT("/follow-records/:id", DataScopeGuard("follow_record"), followHandler.UpdateRecord)
		auth.DELETE("/follow-records/:id", DataScopeGuard("follow_record"), followHandler.DeleteRecord)

		// 跟进计划
		auth.POST("/follow-plans", followHandler.CreatePlan)
		auth.GET("/follow-plans/:id", DataScopeGuard("follow_plan"), followHandler.GetPlan)
		auth.PUT("/follow-plans/:id", DataScopeGuard("follow_plan"), followHandler.UpdatePlan)
		auth.DELETE("/follow-plans/:id", DataScopeGuard("follow_plan"), followHandler.DeletePlan)
		auth.POST("/follow-plans/:id/convert", DataScopeGuard("follow_plan"), followHandler.ConvertPlanToRecord)
		auth.POST("/follow-plans/:id/skip", DataScopeGuard("follow_plan"), followHandler.SkipPlan)

		// 公海池
		auth.GET("/customer-pools", poolHandler.ListPools)
		auth.POST("/customer-pools", poolHandler.CreatePool)
		auth.GET("/customer-pools/:id", poolHandler.GetPool)
		auth.PUT("/customer-pools/:id", poolHandler.UpdatePool)
		auth.DELETE("/customer-pools/:id", poolHandler.DeletePool)
		auth.PUT("/customer-pools/:id/pick-rule", poolHandler.SetPickRule)
		auth.PUT("/customer-pools/:id/recycle-rule", poolHandler.SetRecycleRule)
		auth.POST("/customer-pools/:id/recycle", poolHandler.ManualRecycle)

		// 线索管理
		auth.GET("/leads", leadHandler.List)
		auth.POST("/leads", leadHandler.Create)
		auth.GET("/leads/:id", DataScopeGuard("lead"), leadHandler.GetByID)
		auth.PUT("/leads/:id", DataScopeGuard("lead"), leadHandler.Update)
		auth.DELETE("/leads/:id", DataScopeGuard("lead"), leadHandler.Delete)
		auth.POST("/leads/:id/release", DataScopeGuard("lead"), leadHandler.ReleaseToPool)
		auth.POST("/leads/:id/pick", leadHandler.PickFromPool)
		auth.POST("/leads/:id/transfer", DataScopeGuard("lead"), leadHandler.Transfer)
		auth.POST("/leads/:id/convert", DataScopeGuard("lead"), leadHandler.Convert)

		// 线索公海池
		auth.GET("/lead-pools", leadPoolHandler.ListPools)
		auth.POST("/lead-pools", leadPoolHandler.CreatePool)
		auth.GET("/lead-pools/:id", leadPoolHandler.GetPool)
		auth.PUT("/lead-pools/:id", leadPoolHandler.UpdatePool)
		auth.DELETE("/lead-pools/:id", leadPoolHandler.DeletePool)
		auth.PUT("/lead-pools/:id/pick-rule", leadPoolHandler.SetPickRule)
		auth.PUT("/lead-pools/:id/recycle-rule", leadPoolHandler.SetRecycleRule)
		auth.POST("/lead-pools/:id/recycle", leadPoolHandler.ManualRecycle)

		// 自定义字段
		auth.GET("/custom-fields", customFieldHandler.ListFields)
		auth.POST("/custom-fields", customFieldHandler.CreateField)
		auth.PUT("/custom-fields/:id", customFieldHandler.UpdateField)
		auth.DELETE("/custom-fields/:id", customFieldHandler.DeleteField)

		// 阶段配置
		auth.GET("/stage-configs/:bizType", stageHandler.GetByBizType)
		auth.PUT("/stage-configs/:bizType", stageHandler.UpdateStages)
	}
}
