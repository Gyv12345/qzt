import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class ProductFlowService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取产品的所有流程
   */
  async findByProduct(productId: string) {
    return this.prisma.productFlow.findMany({
      where: { productId },
      include: {
        nodes: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 获取流程详情
   */
  async findOne(id: string) {
    return this.prisma.productFlow.findUnique({
      where: { id },
      include: {
        nodes: {
          orderBy: { order: 'asc' },
        },
        product: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  /**
   * 创建产品流程
   */
  async create(data: {
    productId: string;
    name: string;
    type: 'NODE' | 'CYCLE';
    config: string;
    nodes?: Array<{
      name: string;
      type: string;
      roleId?: string;
      order: number;
      config?: string;
      notifyConfig?: string;
      cycleConfig?: string;
    }>;
  }) {
    const { nodes, ...flowData } = data;

    return this.prisma.productFlow.create({
      data: {
        ...flowData,
        ...(nodes && {
          nodes: {
            create: nodes,
          },
        }),
      },
      include: {
        nodes: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * 更新流程
   */
  async update(id: string, data: {
    name?: string;
    config?: string;
    enabled?: boolean;
  }) {
    return this.prisma.productFlow.update({
      where: { id },
      data,
      include: {
        nodes: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * 删除流程
   */
  async remove(id: string) {
    return this.prisma.productFlow.delete({
      where: { id },
    });
  }

  /**
   * 启用/禁用流程
   */
  async toggle(id: string) {
    const flow = await this.prisma.productFlow.findUnique({
      where: { id },
      select: { enabled: true },
    });

    if (!flow) {
      throw new Error('流程不存在');
    }

    return this.prisma.productFlow.update({
      where: { id },
      data: { enabled: !flow.enabled },
    });
  }

  // ==================== 流程节点管理 ====================

  /**
   * 添加节点到流程
   */
  async addNode(flowId: string, node: {
    name: string;
    type: string;
    roleId?: string;
    order: number;
    config?: string;
    notifyConfig?: string;
    cycleConfig?: string;
  }) {
    return this.prisma.productFlowNode.create({
      data: {
        flowId,
        ...node,
      },
    });
  }

  /**
   * 更新节点
   */
  async updateNode(nodeId: string, data: {
    name?: string;
    roleId?: string;
    config?: string;
    notifyConfig?: string;
    cycleConfig?: string;
    enabled?: boolean;
  }) {
    return this.prisma.productFlowNode.update({
      where: { id: nodeId },
      data,
    });
  }

  /**
   * 删除节点
   */
  async removeNode(nodeId: string) {
    return this.prisma.productFlowNode.delete({
      where: { id: nodeId },
    });
  }

  // ==================== 流程执行管理 ====================

  /**
   * 创建流程执行记录
   */
  async createExecution(data: {
    nodeId: string;
    contractId?: string;
    customerId?: string;
  }) {
    return this.prisma.productFlowExecution.create({
      data: {
        ...data,
        status: 'PENDING',
      },
      include: {
        node: {
          include: {
            flow: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * 获取流程执行记录
   */
  async findExecutions(filters?: {
    nodeId?: string;
    contractId?: string;
    customerId?: string;
    status?: string;
  }) {
    const where: any = {};

    if (filters?.nodeId) {
      where.nodeId = filters.nodeId;
    }
    if (filters?.contractId) {
      where.contractId = filters.contractId;
    }
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.productFlowExecution.findMany({
      where,
      include: {
        node: {
          include: {
            flow: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 更新执行状态
   */
  async updateExecutionStatus(
    executionId: string,
    status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED',
    result?: string,
    error?: string,
  ) {
    const data: any = {
      status,
    };

    if (status === 'RUNNING') {
      data.executedAt = new Date();
    } else if (status === 'SUCCESS' || status === 'FAILED' || status === 'SKIPPED') {
      data.completedAt = new Date();
    }

    if (result) {
      data.result = result;
    }

    if (error) {
      data.error = error;
    }

    return this.prisma.productFlowExecution.update({
      where: { id: executionId },
      data,
    });
  }

  /**
   * 获取待执行的流程节点
   */
  async findPendingNodes(contractId: string) {
    const executions = await this.prisma.productFlowExecution.findMany({
      where: {
        contractId,
        status: 'PENDING',
      },
      include: {
        node: {
          include: {
            flow: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return executions.map((exec) => ({
      executionId: exec.id,
      node: exec.node,
      contractId: exec.contractId,
      customerId: exec.customerId,
    }));
  }
}
