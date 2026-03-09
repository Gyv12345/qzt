import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  BatchDeleteTasksDto,
  BatchUpdateTasksDto,
  CreateTaskDto,
} from "./dto/create-task.dto";
import { QueryTaskDto } from "./dto/query-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TodoService } from "./todo.service";

@ApiTags("tasks")
@Controller("tasks")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Post()
  @ApiOperation({ summary: "创建任务" })
  create(@Body() createTaskDto: CreateTaskDto, @Request() req: any) {
    return this.todoService.create(createTaskDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: "分页查询任务" })
  findAll(@Query() query: QueryTaskDto) {
    return this.todoService.findAll(query);
  }

  @Patch("batch-update")
  @ApiOperation({ summary: "批量更新任务" })
  batchUpdate(@Body() batchUpdateTasksDto: BatchUpdateTasksDto) {
    return this.todoService.batchUpdate(batchUpdateTasksDto);
  }

  @Delete("batch-delete")
  @ApiOperation({ summary: "批量删除任务" })
  batchDelete(@Body() batchDeleteTasksDto: BatchDeleteTasksDto) {
    return this.todoService.batchDelete(batchDeleteTasksDto);
  }

  @Get(":id")
  @ApiOperation({ summary: "查询任务详情" })
  findOne(@Param("id") id: string) {
    return this.todoService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "更新任务" })
  update(@Param("id") id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.todoService.update(id, updateTaskDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除任务" })
  remove(@Param("id") id: string) {
    return this.todoService.remove(id);
  }
}
