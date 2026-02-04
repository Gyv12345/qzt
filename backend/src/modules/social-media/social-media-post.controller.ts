import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SocialMediaPostService } from './services/social-media-post.service';
import {
  CreateSocialMediaPostDto,
  UpdateSocialMediaPostDto,
  QuerySocialMediaPostDto,
  PublishSocialMediaPostDto,
  SchedulePublishDto,
  BatchPublishDto,
} from './dto/social-media-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('新媒体管理-内容')
@Controller('social-media/posts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SocialMediaPostController {
  constructor(private readonly postService: SocialMediaPostService) {}

  @Post()
  @ApiOperation({ summary: '创建新媒体内容' })
  async create(@Body() createDto: CreateSocialMediaPostDto) {
    const post = await this.postService.create(createDto);
    return {
      success: true,
      data: post,
      message: '创建成功',
    };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新新媒体内容' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateSocialMediaPostDto) {
    const post = await this.postService.update(id, updateDto);
    return {
      success: true,
      data: post,
      message: '更新成功',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除新媒体内容' })
  async delete(@Param('id') id: string) {
    const post = await this.postService.delete(id);
    return {
      success: true,
      data: post,
      message: '删除成功',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取新媒体内容详情' })
  async findOne(@Param('id') id: string) {
    const post = await this.postService.findById(id);
    if (!post) {
      return {
        success: false,
        message: '内容不存在',
      };
    }
    return {
      success: true,
      data: post,
    };
  }

  @Get()
  @ApiOperation({ summary: '获取新媒体内容列表' })
  async findAll(@Query() query: QuerySocialMediaPostDto) {
    const result = await this.postService.findAll(query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  @Post('publish')
  @ApiOperation({ summary: '发布内容' })
  async publish(@Body() dto: PublishSocialMediaPostDto) {
    const post = await this.postService.publish(dto.id);
    return {
      success: true,
      data: post,
      message: '发布成功',
    };
  }

  @Post('schedule')
  @ApiOperation({ summary: '定时发布' })
  async schedulePublish(@Body() dto: SchedulePublishDto) {
    const post = await this.postService.schedulePublish(dto.id, new Date(dto.scheduledAt));
    return {
      success: true,
      data: post,
      message: '定时发布设置成功',
    };
  }

  @Post('cancel-schedule/:id')
  @ApiOperation({ summary: '取消定时发布' })
  async cancelScheduled(@Param('id') id: string) {
    const post = await this.postService.cancelScheduled(id);
    return {
      success: true,
      data: post,
      message: '取消定时发布成功',
    };
  }

  @Post('batch-publish')
  @ApiOperation({ summary: '批量发布' })
  async batchPublish(@Body() dto: BatchPublishDto) {
    const posts = await this.postService.batchPublish(dto.ids);
    return {
      success: true,
      data: posts,
      message: '批量发布完成',
    };
  }

  @Get(':id/publish-logs')
  @ApiOperation({ summary: '查询内容发布日志' })
  async getPublishLogs(
    @Param('id') id: string,
    @Query() query: { page?: number; pageSize?: number },
  ) {
    const result = await this.postService.getPublishLogs(id, query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    };
  }

  @Get('publish-logs')
  @ApiOperation({ summary: '查询所有发布日志' })
  async getAllPublishLogs(@Query() query: {
    page?: number;
    pageSize?: number;
    platform?: string;
    status?: string;
  }) {
    const result = await this.postService.getAllPublishLogs(query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
    };
  }
}
