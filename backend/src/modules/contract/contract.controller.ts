import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { QueryContractDto } from './dto/query-contract.dto';

@ApiTags('contracts')
@Controller('contracts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  @ApiOperation({ summary: '创建合同' })
  create(@Body() createContractDto: CreateContractDto) {
    return this.contractService.create(createContractDto);
  }

  @Get()
  @ApiOperation({ summary: '获取合同列表' })
  findAll(@Query() query: QueryContractDto) {
    return this.contractService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取合同详情' })
  findOne(@Param('id') id: string) {
    return this.contractService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新合同' })
  update(@Param('id') id: string, @Body() updateContractDto: UpdateContractDto) {
    return this.contractService.update(id, updateContractDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除合同' })
  remove(@Param('id') id: string) {
    return this.contractService.remove(id);
  }

  @Post(':id/update-payment-status')
  @ApiOperation({ summary: '更新合同收款状态' })
  updatePaymentStatus(@Param('id') id: string) {
    return this.contractService.updatePaymentStatus(id);
  }
}
