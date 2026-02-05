import { Controller, Get, Post, Body, Param, Delete, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommonPhraseService } from './services/common-phrase.service';
import { PaymentAccountService } from './services/payment-account.service';
import { PrismaService } from '@/common/prisma/prisma.service';

@ApiTags('system')
@Controller('system')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SystemController {
  constructor(
    private readonly commonPhraseService: CommonPhraseService,
    private readonly paymentAccountService: PaymentAccountService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== 常用语管理 ====================

  @Get('common-phrases')
  @ApiOperation({ summary: '获取常用语列表' })
  async findCommonPhrases(@Query('userId') userId?: string) {
    return this.commonPhraseService.findAll(userId);
  }

  @Post('common-phrases')
  @ApiOperation({ summary: '创建常用语' })
  async createCommonPhrase(
    @Body('userId') userId: string,
    @Body('content') content: string,
    @Body('category') category?: string,
    @Body('isSystem') isSystem?: boolean,
  ) {
    return this.commonPhraseService.create(userId, content, category, isSystem);
  }

  @Patch('common-phrases/:id')
  @ApiOperation({ summary: '更新常用语' })
  async updateCommonPhrase(
    @Param('id') id: string,
    @Body('content') content?: string,
    @Body('category') category?: string,
  ) {
    return this.commonPhraseService.update(id, content, category);
  }

  @Delete('common-phrases/:id')
  @ApiOperation({ summary: '删除常用语' })
  async removeCommonPhrase(@Param('id') id: string) {
    return this.commonPhraseService.remove(id);
  }

  @Get('common-phrases/search')
  @ApiOperation({ summary: '搜索常用语' })
  async searchCommonPhrases(
    @Query('keyword') keyword: string,
    @Query('userId') userId?: string,
  ) {
    return this.commonPhraseService.search(keyword, userId);
  }

  @Post('common-phrases/:id/use')
  @ApiOperation({ summary: '增加常用语使用次数' })
  async incrementPhraseUsage(@Param('id') id: string) {
    return this.commonPhraseService.incrementUseCount(id);
  }

  // ==================== 收款账号管理 ====================

  @Get('payment-accounts')
  @ApiOperation({ summary: '获取收款账号列表' })
  async findPaymentAccounts(@Query('type') type?: string) {
    return this.paymentAccountService.findAll(type);
  }

  @Get('payment-accounts/default')
  @ApiOperation({ summary: '获取默认收款账号' })
  async findDefaultPaymentAccount() {
    return this.paymentAccountService.findDefault();
  }

  @Post('payment-accounts')
  @ApiOperation({ summary: '创建收款账号' })
  async createPaymentAccount(@Body() data: any) {
    return this.paymentAccountService.create(data);
  }

  @Patch('payment-accounts/:id')
  @ApiOperation({ summary: '更新收款账号' })
  async updatePaymentAccount(@Param('id') id: string, @Body() data: any) {
    return this.paymentAccountService.update(id, data);
  }

  @Delete('payment-accounts/:id')
  @ApiOperation({ summary: '删除收款账号' })
  async removePaymentAccount(@Param('id') id: string) {
    return this.paymentAccountService.remove(id);
  }

  @Patch('payment-accounts/:id/default')
  @ApiOperation({ summary: '设置默认账号' })
  async setDefaultPaymentAccount(
    @Param('id') id: string,
    @Query('type') type: string,
  ) {
    return this.paymentAccountService.setDefault(id, type);
  }
}
