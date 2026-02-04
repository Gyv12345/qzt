import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SocialMediaAccountService } from './services/social-media-account.service';
import {
  CreateSocialMediaAccountDto,
  UpdateSocialMediaAccountDto,
  QuerySocialMediaAccountDto,
  RefreshTokenDto,
} from './dto/social-media-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('social-media-accounts')
@Controller('social-media/accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SocialMediaAccountController {
  constructor(private readonly accountService: SocialMediaAccountService) {}

  @Post()
  @ApiOperation({ summary: '创建新媒体账号' })
  async create(@Body() createDto: CreateSocialMediaAccountDto) {
    const account = await this.accountService.create(createDto);
    return {
      success: true,
      data: account,
      message: '创建成功',
    };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新新媒体账号' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateSocialMediaAccountDto) {
    const account = await this.accountService.update(id, updateDto);
    return {
      success: true,
      data: account,
      message: '更新成功',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除新媒体账号' })
  async delete(@Param('id') id: string) {
    const account = await this.accountService.delete(id);
    return {
      success: true,
      data: account,
      message: '删除成功',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取新媒体账号详情' })
  async findOne(@Param('id') id: string) {
    const account = await this.accountService.findById(id);
    if (!account) {
      return {
        success: false,
        message: '账号不存在',
      };
    }
    return {
      success: true,
      data: account,
    };
  }

  @Get()
  @ApiOperation({ summary: '获取新媒体账号列表' })
  async findAll(@Query() query: QuerySocialMediaAccountDto) {
    const result = await this.accountService.findAll(query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  @Post('refresh-token')
  @ApiOperation({ summary: '刷新访问令牌' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const result = await this.accountService.refreshAccessToken(dto.id);
    return {
      success: true,
      data: result,
      message: '刷新成功',
    };
  }

  @Get(':id/validate')
  @ApiOperation({ summary: '验证账号有效性' })
  async validateAccount(@Param('id') id: string) {
    const isValid = await this.accountService.validateAccount(id);
    return {
      success: true,
      data: {
        isValid,
      },
    };
  }
}
