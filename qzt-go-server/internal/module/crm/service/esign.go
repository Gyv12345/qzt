package service

// esign.go 电子签(e签宝)服务:半自动流程的核心逻辑层。
//
// 流程:
//  1. 合同审批通过(event_listener)→ 若开启 esign,插一条 PENDING 任务。
//  2. cron(crm.esign.retry)扫 PENDING/FAILED → 渲染合同 Markdown → pdfgen 生成 PDF →
//     存私有桶 → 状态置 READY,通知负责人「PDF 已生成,待补签署方」。
//  3. 用户在合同详情填签署方姓名+手机 → Initiate:重新渲染 PDF → 上传 e签宝 → 创建签署流程 →
//     状态置 INITIATED,回填 flow_id/sign_url,通知负责人。
//  4. e签宝签署回调 → HandleCallback:按签署状态流转 task/contract;完成则下载签署件存档。
//
// 配置走 sys_config(esign.enabled/app_id/app_secret/base_url/callback_url),setting.Get 热读。

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"qzt-go-server/internal/app"
	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/esignclient"
	"qzt-go-server/internal/pkg/pdfgen"
	"qzt-go-server/internal/pkg/setting"
	oasvc "qzt-go-server/internal/module/oa/service"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
)

// EsignTaskDetail 合同电子签详情(任务 + 私有 PDF 短期预览 URL)。
type EsignTaskDetail struct {
	*crmmodel.CrmEsignTask
	FileURL string `json:"file_url"` // 私有桶 PDF 的短期预览/下载 URL(READY 后才有)
}

// EsignService 电子签服务。
type EsignService struct {
	taskRepo     *crrepo.EsignTaskRepo
	contractRepo *crrepo.ContractRepo
	docSvc       *ContractDocumentService
	msgSvc       *oasvc.MessageService
}

// NewEsignService 创建电子签服务(无参,内部 new 各依赖,与 CRM 其它 service 风格一致)。
func NewEsignService() *EsignService {
	return &EsignService{
		taskRepo:     crrepo.NewEsignTaskRepo(),
		contractRepo: crrepo.NewContractRepo(),
		docSvc:       NewContractDocumentService(),
		msgSvc:       oasvc.NewMessageService(),
	}
}

// loadClient 读 sys_config 组装 e签宝客户端;未启用或缺凭证返回明确错误。
func (s *EsignService) loadClient(ctx context.Context) (*esignclient.Client, error) {
	if !cfgBool(ctx, "esign.enabled", false) {
		return nil, fmt.Errorf("电子签功能未启用(请在系统配置开启 esign.enabled)")
	}
	appID := setting.Get(ctx, "esign.app_id")
	appSecret := setting.Get(ctx, "esign.app_secret")
	if appID == "" || appSecret == "" {
		return nil, fmt.Errorf("电子签凭证未配置(esign.app_id / esign.app_secret)")
	}
	return esignclient.NewClient(esignclient.Config{
		AppID:       appID,
		AppSecret:   appSecret,
		BaseURL:     setting.Get(ctx, "esign.base_url"),
		CallbackURL: setting.Get(ctx, "esign.callback_url"),
	}), nil
}

// ProcessPendingTasks 扫描 PENDING/FAILED 任务,渲染 PDF 并置 READY(cron 调)。
// 仅负责「生成 PDF + 停在待补签署方」,不发起签署(发起走 Initiate)。
// 总开关 esign.enabled=false 时整体跳过。
func (s *EsignService) ProcessPendingTasks(ctx context.Context) error {
	if !cfgBool(ctx, "esign.enabled", false) {
		return nil
	}
	tasks, err := s.taskRepo.ListRetryable(ctx, time.Now(), 50)
	if err != nil {
		return fmt.Errorf("查询待处理电子签任务失败: %w", err)
	}
	processed := 0
	for i := range tasks {
		task := &tasks[i]
		// 乐观锁占位:仅 PENDING/FAILED 能置 RUNNING,返回 0 说明被并发抢占,跳过
		n, err := s.taskRepo.MarkRunning(ctx, task.ID)
		if err != nil {
			xlogger.ErrorfCtx(ctx, "电子签:MarkRunning 失败 task_id=%d: %v", task.ID, err)
			continue
		}
		if n == 0 {
			continue
		}
		s.renderPDF(ctx, task)
		processed++
	}
	if len(tasks) > 0 {
		xlogger.InfofCtx(ctx, "电子签:扫描 %d 条任务,处理 %d 条", len(tasks), processed)
	}
	return nil
}

// renderPDF 渲染单个任务的合同 PDF 并入库(成功→READY,失败→FAILED+退避)。
func (s *EsignService) renderPDF(ctx context.Context, task *crmmodel.CrmEsignTask) {
	contract, err := s.contractRepo.GetByID(ctx, task.ContractID)
	if err != nil {
		s.failTask(ctx, task, fmt.Errorf("查询合同失败: %w", err))
		return
	}
	templateID := task.TemplateID
	if templateID == 0 && contract.TemplateID != nil {
		templateID = *contract.TemplateID
	}
	if templateID == 0 {
		s.failTask(ctx, task, fmt.Errorf("合同未关联签署模板(template_id 为空)"))
		return
	}
	md, err := s.docSvc.Render(ctx, task.ContractID, templateID)
	if err != nil {
		s.failTask(ctx, task, fmt.Errorf("渲染合同文档失败: %w", err))
		return
	}
	pdf, err := pdfgen.GenerateFromMarkdown(md, contract.Name)
	if err != nil {
		s.failTask(ctx, task, fmt.Errorf("生成 PDF 失败(请确认已安装 wkhtmltopdf): %w", err))
		return
	}
	fileName := sanitizeFileName(contract.Name) + ".pdf"
	up, err := app.GetUploader().SavePrivateBytes(fileName, pdf, "application/pdf", "esign")
	if err != nil {
		s.failTask(ctx, task, fmt.Errorf("存储签署 PDF 失败: %w", err))
		return
	}
	if err := s.taskRepo.UpdateColumns(ctx, task.ID, map[string]any{
		"status":   crmmodel.EsignTaskReady,
		"file_key": up.URL,
		"error":    "",
	}); err != nil {
		xlogger.ErrorfCtx(ctx, "电子签:更新任务 READY 失败 task_id=%d: %v", task.ID, err)
		return
	}
	xlogger.InfofCtx(ctx, "电子签:合同 %d PDF 已生成(task=%d),待补签署方", task.ContractID, task.ID)
	s.notifyOwner(ctx, task.ContractID, "合同电子签 PDF 已生成",
		fmt.Sprintf("合同「%s」的签署 PDF 已生成,请前往合同详情补充签署方后发起签署。", contract.Name))
}

// failTask 标记任务失败 + 指数退避(2^retry 分钟,上限 24h)。error 截断 500 字符。
func (s *EsignService) failTask(ctx context.Context, task *crmmodel.CrmEsignTask, cause error) {
	retry := task.RetryCount + 1
	backoff := time.Duration(1<<uint(retry)) * time.Minute // 2^retry
	if backoff > 24*time.Hour {
		backoff = 24 * time.Hour
	}
	if err := s.taskRepo.UpdateColumns(ctx, task.ID, map[string]any{
		"status":        crmmodel.EsignTaskFailed,
		"retry_count":   retry,
		"next_retry_at": time.Now().Add(backoff),
		"error":         truncate(cause.Error(), 500),
	}); err != nil {
		xlogger.ErrorfCtx(ctx, "电子签:标记任务失败写库异常 task_id=%d: %v", task.ID, err)
	}
	xlogger.ErrorfCtx(ctx, "电子签:合同 %d PDF 生成失败(task=%d, retry=%d): %v",
		task.ContractID, task.ID, retry, cause)
}

// Initiate 用户补充签署方后发起签署(READY → INITIATED)。
// 重新渲染 PDF(确定性,与 READY 预览版一致)→ 上传 e签宝 → 创建签署流程 → 回填状态。
func (s *EsignService) Initiate(ctx context.Context, contractID uint, signers []esignclient.Signer) error {
	if len(signers) == 0 {
		return fmt.Errorf("请至少添加一个签署方")
	}
	for i := range signers {
		if signers[i].Name == "" || (signers[i].Mobile == "" && signers[i].Email == "") {
			return fmt.Errorf("第 %d 个签署方缺少姓名或联系方式(手机/邮箱)", i+1)
		}
		if signers[i].SignOrder == 0 {
			signers[i].SignOrder = i + 1
		}
	}
	task, err := s.taskRepo.GetByContractID(ctx, contractID)
	if err != nil {
		return fmt.Errorf("未找到电子签任务: %w", err)
	}
	if task.Status != crmmodel.EsignTaskReady {
		return fmt.Errorf("当前签署状态为 %s,需 PDF 生成完成(READY)后才可发起", task.Status)
	}
	client, err := s.loadClient(ctx)
	if err != nil {
		return err
	}
	contract, err := s.contractRepo.GetByID(ctx, contractID)
	if err != nil {
		return fmt.Errorf("查询合同失败: %w", err)
	}

	// 渲染 PDF(与预览版一致)并覆盖存档,保证 file_key 指向实际签署版
	md, err := s.docSvc.Render(ctx, contractID, task.TemplateID)
	if err != nil {
		return fmt.Errorf("渲染合同文档失败: %w", err)
	}
	pdf, err := pdfgen.GenerateFromMarkdown(md, contract.Name)
	if err != nil {
		return fmt.Errorf("生成 PDF 失败: %w", err)
	}
	fileName := sanitizeFileName(contract.Name) + ".pdf"
	up, err := app.GetUploader().SavePrivateBytes(fileName, pdf, "application/pdf", "esign")
	if err != nil {
		return fmt.Errorf("存储签署 PDF 失败: %w", err)
	}

	// 上传 e签宝 + 创建签署流程
	fileID, err := client.UploadFile(ctx, fileName, pdf)
	if err != nil {
		return fmt.Errorf("上传 PDF 到 e签宝失败: %w", err)
	}
	subject := fmt.Sprintf("合同签署:%s", contract.Name)
	result, err := client.CreateSignFlow(ctx, subject,
		[]esignclient.SignFile{{FileID: fileID, FileName: fileName}}, signers)
	if err != nil {
		return fmt.Errorf("创建签署流程失败: %w", err)
	}

	signersJSON, _ := json.Marshal(signers)
	if err := s.taskRepo.UpdateColumns(ctx, task.ID, map[string]any{
		"status":   crmmodel.EsignTaskInitiated,
		"flow_id":  result.FlowID,
		"sign_url": result.ShortUrl,
		"signers":  string(signersJSON),
		"file_key": up.URL,
	}); err != nil {
		return fmt.Errorf("更新签署任务失败: %w", err)
	}
	// 合同 esign 状态直写(ContractRepo.Update 白名单不含 esign 字段)
	if err := repository.DBFrom(ctx).Model(&crmmodel.CrmContract{}).
		Where("id = ?", contractID).
		UpdateColumns(map[string]any{
			"esign_status":   crmmodel.ContractEsignInitiated,
			"esign_flow_id":  result.FlowID,
		}).Error; err != nil {
		xlogger.ErrorfCtx(ctx, "电子签:更新合同 esign 状态失败 contract_id=%d: %v", contractID, err)
	}
	s.notifyOwner(ctx, contractID, "合同电子签已发起",
		fmt.Sprintf("合同「%s」的电子签署流程已发起,签署短链:%s", contract.Name, result.ShortUrl))
	return nil
}

// HandleCallback 处理 e签宝签署状态回调。
// status:1 签署中 / 2 完成 / 3 撤销 / 4 终止 / 5 过期 / 7 拒签(见 esignclient.FlowStatusResult)。
func (s *EsignService) HandleCallback(ctx context.Context, flowID string, status int) error {
	task, err := s.taskRepo.GetByFlowID(ctx, flowID)
	if err != nil {
		return fmt.Errorf("未找到流程对应的签署任务 flow_id=%s: %w", flowID, err)
	}
	contractID := task.ContractID
	switch status {
	case 1: // 签署中
		s.updateTaskStatus(ctx, task.ID, crmmodel.EsignTaskInitiated, "")
		s.updateContractEsign(ctx, contractID, crmmodel.ContractEsignSigning, "")
	case 2: // 全部完成
		s.updateTaskStatus(ctx, task.ID, crmmodel.EsignTaskCompleted, "")
		s.updateContractEsign(ctx, contractID, crmmodel.ContractEsignSigned, task.FlowID)
		s.archiveSignedFile(ctx, task) // 下载签署件存档(失败不阻断)
		s.notifyOwner(ctx, contractID, "合同电子签已完成", "合同电子签署已全部完成,签署件已存档。")
	case 3, 4, 5, 7: // 撤销/终止/过期/拒签
		s.updateTaskStatus(ctx, task.ID, crmmodel.EsignTaskFailed, fmt.Sprintf("e签宝流程异常(状态码 %d)", status))
		s.updateContractEsign(ctx, contractID, crmmodel.ContractEsignFailed, "")
		s.notifyOwner(ctx, contractID, "合同电子签异常",
			fmt.Sprintf("合同电子签署流程异常终止(状态码 %d),请核查。", status))
	default:
		xlogger.InfofCtx(ctx, "电子签:收到未处理的回调状态 %d (flow=%s)", status, flowID)
	}
	return nil
}

// archiveSignedFile 下载 e签宝签署完成的 PDF 并存私有桶(覆盖 file_key 为签署件)。
func (s *EsignService) archiveSignedFile(ctx context.Context, task *crmmodel.CrmEsignTask) {
	client, err := s.loadClient(ctx)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "电子签:下载签署件跳过(凭证未配置) task=%d: %v", task.ID, err)
		return
	}
	pdfBytes, err := client.DownloadSignedFile(ctx, task.FlowID)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "电子签:下载签署件失败 task=%d: %v", task.ID, err)
		return
	}
	up, err := app.GetUploader().SavePrivateBytes(
		"signed-"+sanitizeFileName(task.FlowID)+".pdf", pdfBytes, "application/pdf", "esign")
	if err != nil {
		xlogger.ErrorfCtx(ctx, "电子签:存档签署件失败 task=%d: %v", task.ID, err)
		return
	}
	s.taskRepo.UpdateColumns(ctx, task.ID, map[string]any{"file_key": up.URL})
}

// GetDetail 取合同电子签详情(任务 + 私有 PDF 短期预览 URL)。
func (s *EsignService) GetDetail(ctx context.Context, contractID uint) (*EsignTaskDetail, error) {
	task, err := s.taskRepo.GetByContractID(ctx, contractID)
	if err != nil {
		return nil, err
	}
	detail := &EsignTaskDetail{CrmEsignTask: task}
	if task.FileKey != "" {
		if url, err := app.GetUploader().SignURL(task.FileKey, time.Hour); err == nil {
			detail.FileURL = url
		}
	}
	return detail, nil
}

// ── 内部辅助 ──

func (s *EsignService) updateTaskStatus(ctx context.Context, id uint, status, errStr string) {
	cols := map[string]any{"status": status}
	if errStr != "" {
		cols["error"] = errStr
	}
	if err := s.taskRepo.UpdateColumns(ctx, id, cols); err != nil {
		xlogger.ErrorfCtx(ctx, "电子签:更新任务状态失败 task_id=%d: %v", id, err)
	}
}

// updateContractEsign 直写合同 esign 状态(绕过 ContractRepo.Update 白名单)。
func (s *EsignService) updateContractEsign(ctx context.Context, contractID uint, status, flowID string) {
	cols := map[string]any{"esign_status": status}
	if flowID != "" {
		cols["esign_flow_id"] = flowID
	}
	if err := repository.DBFrom(ctx).Model(&crmmodel.CrmContract{}).
		Where("id = ?", contractID).UpdateColumns(cols).Error; err != nil {
		xlogger.ErrorfCtx(ctx, "电子签:更新合同 esign 状态失败 contract_id=%d: %v", contractID, err)
	}
}

// notifyOwner 通知合同负责人(缺失负责人则跳过,失败仅记日志)。
func (s *EsignService) notifyOwner(ctx context.Context, contractID uint, title, content string) {
	contract, err := s.contractRepo.GetByID(ctx, contractID)
	if err != nil || contract.OwnerID == nil || *contract.OwnerID == 0 {
		return
	}
	if err := s.msgSvc.SendSystemMessage(ctx, *contract.OwnerID, title, content); err != nil {
		xlogger.ErrorfCtx(ctx, "电子签:通知负责人失败 user=%d: %v", *contract.OwnerID, err)
	}
}

var unsafeFileNameChars = regexp.MustCompile(`[\\/:*?"<>|\r\n\t]+`)

// sanitizeFileName 清理文件名中的路径分隔符与非法字符(e签宝上传/私有桶文件名用)。
func sanitizeFileName(name string) string {
	name = unsafeFileNameChars.ReplaceAllString(name, "_")
	name = strings.TrimSpace(name)
	if name == "" {
		return "contract"
	}
	return name
}

// truncate 截断字符串到 maxLen(按 rune),超出加省略号。
func truncate(s string, maxLen int) string {
	r := []rune(s)
	if len(r) <= maxLen {
		return s
	}
	return string(r[:maxLen])
}
