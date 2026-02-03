import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('departments')
@Controller('departments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @ApiOperation({ summary: '创建部门' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '父部门不存在' })
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentService.create(createDepartmentDto);
  }

  @Get()
  @ApiOperation({ summary: '获取部门树形结构' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findTree() {
    return this.departmentService.findTree();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取部门详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '部门不存在' })
  findOne(@Param('id') id: string) {
    return this.departmentService.findOne(id);
  }

  @Get(':id/users')
  @ApiOperation({ summary: '获取部门下的用户列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '部门不存在' })
  findUsers(@Param('id') id: string) {
    return this.departmentService.findUsers(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新部门' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '部门不存在' })
  update(@Param('id') id: string, @Body() updateDepartmentDto: UpdateDepartmentDto) {
    return this.departmentService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除部门' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '部门不存在' })
  @ApiResponse({ status: 409, description: '部门下有子部门或用户，无法删除' })
  remove(@Param('id') id: string) {
    return this.departmentService.remove(id);
  }
}
