import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateTriggerDto } from '../dto/create-trigger.dto';
import { UpdateTriggerDto } from '../dto/update-trigger.dto';

@Injectable()
export class TriggerService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateTriggerDto) {
    return this.prisma.trigger.create({
      data: {
        ...createDto,
        conditions: {
          create: createDto.conditions || [],
        },
      },
      include: {
        conditions: true,
        workflows: true,
      },
    });
  }

  async findAll(entityType?: string) {
    const where = entityType ? { entityType } : {};

    return this.prisma.trigger.findMany({
      where,
      include: {
        conditions: {
          orderBy: { createdAt: 'asc' },
        },
        workflows: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const trigger = await this.prisma.trigger.findUnique({
      where: { id },
      include: {
        conditions: {
          orderBy: { createdAt: 'asc' },
        },
        workflows: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!trigger) {
      throw new NotFoundException(`Trigger #${id} not found`);
    }

    return trigger;
  }

  async update(id: string, updateDto: UpdateTriggerDto) {
    const trigger = await this.prisma.trigger.findUnique({
      where: { id },
    });

    if (!trigger) {
      throw new NotFoundException(`Trigger #${id} not found`);
    }

    return this.prisma.trigger.update({
      where: { id },
      data: updateDto,
      include: {
        conditions: true,
        workflows: true,
      },
    });
  }

  async remove(id: string) {
    const trigger = await this.prisma.trigger.findUnique({
      where: { id },
    });

    if (!trigger) {
      throw new NotFoundException(`Trigger #${id} not found`);
    }

    await this.prisma.trigger.delete({
      where: { id },
    });

    return { message: 'Trigger deleted successfully' };
  }

  /**
   * 启用/禁用触发器
   */
  async toggleEnabled(id: string, enabled: boolean) {
    return this.prisma.trigger.update({
      where: { id },
      data: { enabled },
    });
  }

  /**
   * 获取启用的触发器列表
   */
  async findEnabled(entityType?: string) {
    const where: any = {
      enabled: true,
    };

    if (entityType) {
      where.entityType = entityType;
    }

    return this.prisma.trigger.findMany({
      where,
      include: {
        conditions: true,
        workflows: {
          where: { enabled: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
