import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateServiceTeamDto } from "./dto/create-service-team.dto";
import { UpdateServiceTeamDto } from "./dto/update-service-team.dto";

@Injectable()
export class ServiceTeamService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateServiceTeamDto) {
    // 验证客户和用户是否存在
    const [customer, user] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: createDto.customerId } }),
      this.prisma.user.findUnique({ where: { id: createDto.userId } }),
    ]);

    if (!customer) {
      throw new NotFoundException(
        `Customer #${createDto.customerId} not found`,
      );
    }
    if (!user) {
      throw new NotFoundException(`User #${createDto.userId} not found`);
    }

    // 检查是否已存在相同的组合
    const existing = await this.prisma.serviceTeam.findUnique({
      where: {
        customerId_userId_roleCode: {
          customerId: createDto.customerId,
          userId: createDto.userId,
          roleCode: createDto.roleCode,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        "Service team member already exists for this customer and role",
      );
    }

    return this.prisma.serviceTeam.create({
      data: createDto,
      include: {
        customer: { select: { name: true } },
        user: { select: { name: true, username: true } },
      },
    });
  }

  async findAll(customerId?: string) {
    const where = customerId ? { customerId } : {};

    return this.prisma.serviceTeam.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        user: { select: { name: true, username: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.serviceTeam.findMany({
      where: { customerId },
      include: {
        customer: { select: { name: true } },
        user: { select: { name: true, username: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const team = await this.prisma.serviceTeam.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true } },
        user: {
          select: { name: true, username: true, phone: true, email: true },
        },
      },
    });

    if (!team) {
      throw new NotFoundException(`Service team member #${id} not found`);
    }

    return team;
  }

  async update(id: string, updateDto: UpdateServiceTeamDto) {
    const team = await this.prisma.serviceTeam.findUnique({
      where: { id },
    });

    if (!team) {
      throw new NotFoundException(`Service team member #${id} not found`);
    }

    return this.prisma.serviceTeam.update({
      where: { id },
      data: updateDto,
      include: {
        customer: { select: { name: true } },
        user: { select: { name: true, username: true } },
      },
    });
  }

  async remove(id: string) {
    const team = await this.prisma.serviceTeam.findUnique({
      where: { id },
    });

    if (!team) {
      throw new NotFoundException(`Service team member #${id} not found`);
    }

    await this.prisma.serviceTeam.delete({
      where: { id },
    });

    return { message: "Service team member deleted successfully" };
  }

  /**
   * 获取客户的服务团队成员(按角色分组)
   */
  async getCustomerTeamGrouped(customerId: string) {
    const members = await this.findByCustomer(customerId);

    // 按角色分组
    const grouped = {
      SALE: [],
      FINANCE: [],
      OUTWORK: [],
    };

    members.forEach((member) => {
      if (grouped[member.roleCode]) {
        grouped[member.roleCode].push(member);
      }
    });

    return grouped;
  }
}
