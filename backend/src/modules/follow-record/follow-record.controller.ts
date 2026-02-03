import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Delete,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FollowRecordService } from './follow-record.service';
import { CreateFollowRecordDto } from './dto/create-follow-record.dto';
import { UpdateFollowRecordDto } from './dto/update-follow-record.dto';

@ApiTags('follow-records')
@Controller('follow-records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FollowRecordController {
  constructor(private readonly followRecordService: FollowRecordService) {}

  @Post()
  @ApiOperation({ summary: '创建跟进记录' })
  create(
    @Body() createFollowRecordDto: CreateFollowRecordDto,
    @Request() req,
  ) {
    return this.followRecordService.create(
      createFollowRecordDto,
      req.user.userId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '获取跟进记录详情' })
  findOne(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.followRecordService.findOne(
      id,
      req.user.userId,
      req.user.isAdmin,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新跟进记录' })
  update(
    @Param('id') id: string,
    @Body() updateFollowRecordDto: UpdateFollowRecordDto,
    @Request() req,
  ) {
    return this.followRecordService.update(
      id,
      updateFollowRecordDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除跟进记录' })
  remove(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.followRecordService.remove(
      id,
      req.user.userId,
    );
  }
}