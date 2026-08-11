package approval

import (
	"context"

	"gorm.io/gorm"

	apprmodel "qzt-go-server/internal/model/approval"
	"qzt-go-server/internal/repository"
)

// flow.go 审批流程设计 repository(6 张表的查询)。

// repoDB 返回当前 context 下的 *gorm.DB。
func repoDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }

// ── 流程主表 ──

type FlowRepo struct {
	repository.BaseRepo[apprmodel.ApprovalFlow]
}

func NewFlowRepo() *FlowRepo { return &FlowRepo{} }

// GetEnabledFlow 按 formType+formKey 获取启用的流程。
func (r *FlowRepo) GetEnabledFlow(ctx context.Context, formType, formKey string) (*apprmodel.ApprovalFlow, error) {
	var flow apprmodel.ApprovalFlow
	err := repoDB(ctx).Where("form_type = ? AND form_key = ? AND enable = 1", formType, formKey).First(&flow).Error
	if err != nil {
		return nil, err
	}
	return &flow, nil
}

// GetByFormType 按 form_type+form_key 查流程(不限启用状态)。供 GetByFormType API 使用。
func (r *FlowRepo) GetByFormType(ctx context.Context, formType, formKey string) (*apprmodel.ApprovalFlow, error) {
	var flow apprmodel.ApprovalFlow
	err := repoDB(ctx).Where("form_type = ? AND form_key = ?", formType, formKey).First(&flow).Error
	if err != nil {
		return nil, err
	}
	return &flow, nil
}

// Update 覆写泛型版本。
func (r *FlowRepo) Update(ctx context.Context, m *apprmodel.ApprovalFlow) error {
	return r.BaseRepo.Update(ctx, m, "Number", "Name", "CreateExecute", "UpdateExecute",
		"SubmitterCanRevoke", "AllowBatchProcess", "AllowWithdraw", "AllowAddSign",
		"DuplicateApproverRule", "RequireComment", "Enable", "StatusPermissions", "Description",
		"CurrentVersionID")
}

// ── 版本 ──

type FlowVersionRepo struct {
	repository.BaseRepo[apprmodel.ApprovalFlowVersion]
}

func NewFlowVersionRepo() *FlowVersionRepo { return &FlowVersionRepo{} }

// ── 节点 ──

type NodeRepo struct {
	repository.BaseRepo[apprmodel.ApprovalNode]
}

func NewNodeRepo() *NodeRepo { return &NodeRepo{} }

// ListByVersion 按版本 ID 列出全部节点(按 sort 排序)。
func (r *NodeRepo) ListByVersion(ctx context.Context, versionID uint) ([]apprmodel.ApprovalNode, error) {
	var nodes []apprmodel.ApprovalNode
	err := repoDB(ctx).Where("flow_version_id = ?", versionID).Order("sort ASC, id ASC").Find(&nodes).Error
	return nodes, err
}

// FindStartNode 按 executeTiming 找 START 节点。
func (r *NodeRepo) FindStartNode(ctx context.Context, versionID uint, timing string) (*apprmodel.ApprovalNode, error) {
	var node apprmodel.ApprovalNode
	q := repoDB(ctx).Where("flow_version_id = ? AND node_type = ?", versionID, apprmodel.NodeTypeStart)
	if timing != "" {
		q = q.Where("execute_timing = ?", timing)
	}
	err := q.Order("id ASC").First(&node).Error
	if err != nil {
		// 兜底:取无 timing 的 START
		if err == gorm.ErrRecordNotFound {
			err = repoDB(ctx).Where("flow_version_id = ? AND node_type = ? AND (execute_timing = '' OR execute_timing IS NULL)",
				versionID, apprmodel.NodeTypeStart).First(&node).Error
		}
		if err != nil {
			return nil, err
		}
	}
	return &node, nil
}

// GetByID 覆写(不需要 preload)。
func (r *NodeRepo) GetByID(ctx context.Context, id uint) (*apprmodel.ApprovalNode, error) {
	var node apprmodel.ApprovalNode
	err := repoDB(ctx).First(&node, id).Error
	if err != nil {
		return nil, err
	}
	return &node, nil
}

// ── 节点审批人配置 ──

type NodeApproverRepo struct {
	repository.BaseRepo[apprmodel.ApprovalNodeApprover]
}

func NewNodeApproverRepo() *NodeApproverRepo { return &NodeApproverRepo{} }

// GetByNodeID 按节点 ID(共享主键)获取审批人配置。
func (r *NodeApproverRepo) GetByNodeID(ctx context.Context, nodeID uint) (*apprmodel.ApprovalNodeApprover, error) {
	var cfg apprmodel.ApprovalNodeApprover
	err := repoDB(ctx).First(&cfg, nodeID).Error
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}

// ── 节点条件配置 ──

type NodeConditionRepo struct {
	repository.BaseRepo[apprmodel.ApprovalNodeCondition]
}

func NewNodeConditionRepo() *NodeConditionRepo { return &NodeConditionRepo{} }

// GetByNodeID 按节点 ID(共享主键)获取条件配置。
func (r *NodeConditionRepo) GetByNodeID(ctx context.Context, nodeID uint) (*apprmodel.ApprovalNodeCondition, error) {
	var cfg apprmodel.ApprovalNodeCondition
	err := repoDB(ctx).First(&cfg, nodeID).Error
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}

// ── 节点连线 ──

type NodeLinkRepo struct {
	repository.BaseRepo[apprmodel.ApprovalNodeLink]
}

func NewNodeLinkRepo() *NodeLinkRepo { return &NodeLinkRepo{} }

// ListByFromNode 按 fromNodeID 列出连线(按 sort 排序)。
func (r *NodeLinkRepo) ListByFromNode(ctx context.Context, versionID, fromNodeID uint) ([]apprmodel.ApprovalNodeLink, error) {
	var links []apprmodel.ApprovalNodeLink
	err := repoDB(ctx).Where("flow_version_id = ? AND from_node_id = ?", versionID, fromNodeID).
		Order("sort ASC, id ASC").Find(&links).Error
	return links, err
}

// ListByVersion 按版本列出全部连线。
func (r *NodeLinkRepo) ListByVersion(ctx context.Context, versionID uint) ([]apprmodel.ApprovalNodeLink, error) {
	var links []apprmodel.ApprovalNodeLink
	err := repoDB(ctx).Where("flow_version_id = ?", versionID).Order("id ASC").Find(&links).Error
	return links, err
}
