import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductFlowService } from './product-flow.service';

@ApiTags('product-flows')
@Controller('product-flows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductFlowController {
  constructor(private readonly productFlowService: ProductFlowService) {}

  @Get('product/:productId')
  @ApiOperation({ summary: '获取产品的所有流程' })
  findByProduct(@Param('productId') productId: string) {
    return this.productFlowService.findByProduct(productId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取流程详情' })
  findOne(@Param('id') id: string) {
    return this.productFlowService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建产品流程' })
  create(@Body() data: {
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
    return this.productFlowService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新流程' })
  update(
    @Param('id') id: string,
    @Body() data: {
      name?: string;
      config?: string;
      enabled?: boolean;
    },
  ) {
    return this.productFlowService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除流程' })
  remove(@Param('id') id: string) {
    return this.productFlowService.remove(id);
  }

  @Put(':id/toggle')
  @ApiOperation({ summary: '启用/禁用流程' })
  toggle(@Param('id') id: string) {
    return this.productFlowService.toggle(id);
  }

  // ==================== 流程节点管理 ====================

  @Post(':id/nodes')
  @ApiOperation({ summary: '添加节点到流程' })
  addNode(
    @Param('id') flowId: string,
    @Body() node: {
      name: string;
      type: string;
      roleId?: string;
      order: number;
      config?: string;
      notifyConfig?: string;
      cycleConfig?: string;
    },
  ) {
    return this.productFlowService.addNode(flowId, node);
  }

  @Put('nodes/:nodeId')
  @ApiOperation({ summary: '更新节点' })
  updateNode(
    @Param('nodeId') nodeId: string,
    @Body() data: {
      name?: string;
      roleId?: string;
      config?: string;
      notifyConfig?: string;
      cycleConfig?: string;
      enabled?: boolean;
    },
  ) {
    return this.productFlowService.updateNode(nodeId, data);
  }

  @Delete('nodes/:nodeId')
  @ApiOperation({ summary: '删除节点' })
  removeNode(@Param('nodeId') nodeId: string) {
    return this.productFlowService.removeNode(nodeId);
  }

  // ==================== 流程执行管理 ====================

  @Post('executions')
  @ApiOperation({ summary: '创建流程执行记录' })
  createExecution(@Body() data: {
    nodeId: string;
    contractId?: string;
    customerId?: string;
  }) {
    return this.productFlowService.createExecution(data);
  }

  @Get('executions')
  @ApiOperation({ summary: '获取流程执行记录' })
  findExecutions(@Query() filters?: {
    nodeId?: string;
    contractId?: string;
    customerId?: string;
    status?: string;
  }) {
    return this.productFlowService.findExecutions(filters);
  }

  @Put('executions/:executionId/status')
  @ApiOperation({ summary: '更新执行状态' })
  updateExecutionStatus(
    @Param('executionId') executionId: string,
    @Body() data: {
      status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
      result?: string;
      error?: string;
    },
  ) {
    return this.productFlowService.updateExecutionStatus(
      executionId,
      data.status,
      data.result,
      data.error,
    );
  }

  @Get('executions/pending/:contractId')
  @ApiOperation({ summary: '获取待执行的流程节点' })
  findPendingNodes(@Param('contractId') contractId: string) {
    return this.productFlowService.findPendingNodes(contractId);
  }
}
