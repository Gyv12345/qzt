import {
  Controller,
  Get,
  Post,
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
      req.user.isAdmin,
    );
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: '获取客户的跟进记录列表' })
  findByCustomer(
    @Param('customerId') customerId: string,
    @Request() req,
  ) {
    return this.followRecordService.findByCustomer(
      customerId,
      req.user.userId,
      req.user.isAdmin,
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
      req.user.isAdmin,
    );
  }
}