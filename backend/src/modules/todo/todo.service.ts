import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  BatchDeleteTasksDto,
  BatchUpdateTasksDto,
  CreateTaskDto,
} from "./dto/create-task.dto";
import { QueryTaskDto } from "./dto/query-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

@Injectable()
export class TodoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTaskDto: CreateTaskDto, currentUserId: string) {
    const data = this.mapTaskCreateInput(createTaskDto, currentUserId);
    return this.prisma.task.create({
      data,
      include: this.taskInclude,
    });
  }

  async findAll(query: QueryTaskDto) {
    const page = query.page || DEFAULT_PAGE;
    const pageSize = query.pageSize || DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    const where: Prisma.TaskWhereInput = {};
    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword } },
        { description: { contains: query.keyword } },
      ];
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.priority) {
      where.priority = query.priority;
    }
    if (query.assigneeId) {
      where.assigneeId = query.assigneeId;
    }

    const sortField = query.sortField || "createdAt";
    const sortOrder = query.sortOrder || "desc";

    const [total, data] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [sortField]: sortOrder,
        },
        include: this.taskInclude,
      }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: this.taskInclude,
    });

    if (!task) {
      throw new NotFoundException(`任务 ${id} 不存在`);
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    await this.findOne(id);
    const data = this.mapTaskUpdateInput(updateTaskDto);

    return this.prisma.task.update({
      where: { id },
      data,
      include: this.taskInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.task.delete({
      where: { id },
    });
  }

  async batchUpdate(batchUpdateTasksDto: BatchUpdateTasksDto) {
    const { taskIds } = batchUpdateTasksDto;
    if (!taskIds.length) {
      throw new BadRequestException("taskIds 不能为空");
    }

    const data = this.mapTaskUpdateInput(batchUpdateTasksDto);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException("批量更新字段不能为空");
    }

    const result = await this.prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data,
    });

    return {
      updatedCount: result.count,
    };
  }

  async batchDelete(batchDeleteTasksDto: BatchDeleteTasksDto) {
    const { taskIds } = batchDeleteTasksDto;
    if (!taskIds.length) {
      throw new BadRequestException("taskIds 不能为空");
    }

    const result = await this.prisma.task.deleteMany({
      where: { id: { in: taskIds } },
    });

    return {
      deletedCount: result.count,
    };
  }

  private mapTaskUpdateInput(
    input: Partial<CreateTaskDto>,
  ): Prisma.TaskUncheckedUpdateInput {
    const data: Prisma.TaskUncheckedUpdateInput = {};

    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (input.label !== undefined) data.label = input.label;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.dueDate !== undefined) {
      data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }
    if (input.assigneeId !== undefined) {
      data.assigneeId = input.assigneeId?.trim() ? input.assigneeId : null;
    }

    return data;
  }

  private mapTaskCreateInput(
    input: CreateTaskDto,
    currentUserId: string,
  ): Prisma.TaskUncheckedCreateInput {
    return {
      title: input.title,
      description: input.description || null,
      status: input.status || "todo",
      label: input.label || "feature",
      priority: input.priority || "medium",
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      assigneeId: input.assigneeId?.trim() ? input.assigneeId : null,
      createdById: currentUserId || null,
    };
  }

  private readonly taskInclude = {
    assignee: {
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
      },
    },
    creator: {
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
      },
    },
  } satisfies Prisma.TaskInclude;
}
