import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateCmsContentDto } from "./dto/create-cms-content.dto";
import { UpdateCmsContentDto } from "./dto/update-cms-content.dto";
import { QueryCmsContentDto } from "./dto/query-cms-content.dto";
import { CreateCmsTagDto } from "./dto/create-cms-tag.dto";
import { UpdateCmsTagDto } from "./dto/update-cms-tag.dto";

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService) {}

  // ==================== 内容管理 ====================

  async createContent(
    createCmsContentDto: CreateCmsContentDto,
    authorId: string,
  ) {
    const { tagIds, ...data } = createCmsContentDto;

    // 验证内容类型与关联字段的一致性
    this.validateContentTypeRelations(
      data.contentType,
      data.productId,
      data.userId,
    );

    // 检查 slug 是否重复
    const existing = await this.prisma.cmsContent.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      throw new BadRequestException("URL别名已存在");
    }

    // 创建内容
    const content = await this.prisma.cmsContent.create({
      data: {
        ...data,
        authorId,
        ...(tagIds && {
          tags: {
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        product: {
          select: { id: true, name: true, code: true },
        },
        userProfile: {
          select: { id: true, name: true, avatar: true },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return this.formatContentResponse(content);
  }

  async findAllContents(query: QueryCmsContentDto) {
    const {
      page = 1,
      pageSize = 10,
      keyword,
      contentType,
      status,
      tagId,
      authorId,
    } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { excerpt: { contains: keyword } },
        { content: { contains: keyword } },
      ];
    }

    if (contentType) {
      where.contentType = contentType;
    }

    if (status) {
      where.status = status;
    }

    if (tagId) {
      where.tags = {
        some: { tagId },
      };
    }

    if (authorId) {
      where.authorId = authorId;
    }

    const [total, contents] = await Promise.all([
      this.prisma.cmsContent.count({ where }),
      this.prisma.cmsContent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
          product: {
            select: { id: true, name: true, code: true },
          },
          userProfile: {
            select: { id: true, name: true, avatar: true },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      data: contents.map((c) => this.formatContentResponse(c)),
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOneContent(id: string) {
    const content = await this.prisma.cmsContent.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            price: true,
          },
        },
        userProfile: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
            phone: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundException(`Content #${id} not found`);
    }

    return this.formatContentResponse(content);
  }

  async updateContent(id: string, updateCmsContentDto: UpdateCmsContentDto) {
    const { tagIds, ...data } = updateCmsContentDto;

    // 验证内容是否存在
    const existing = await this.prisma.cmsContent.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Content #${id} not found`);
    }

    // 如果更新 slug，检查是否重复
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await this.prisma.cmsContent.findUnique({
        where: { slug: data.slug },
      });
      if (slugExists) {
        throw new BadRequestException("URL别名已存在");
      }
    }

    // 验证内容类型与关联字段的一致性
    const contentType = data.contentType || existing.contentType;
    const productId =
      data.productId !== undefined ? data.productId : existing.productId;
    const userId = data.userId !== undefined ? data.userId : existing.userId;
    this.validateContentTypeRelations(contentType, productId, userId);

    // 更新标签关联
    let updateTags = undefined;
    if (tagIds !== undefined) {
      // 删除旧的标签关联
      await this.prisma.cmsContentTag.deleteMany({
        where: { contentId: id },
      });
      // 创建新的标签关联
      updateTags = {
        create: tagIds.map((tagId) => ({ tagId })),
      };
    }

    const content = await this.prisma.cmsContent.update({
      where: { id },
      data: {
        ...data,
        ...(updateTags && { tags: updateTags }),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        product: {
          select: { id: true, name: true, code: true },
        },
        userProfile: {
          select: { id: true, name: true, avatar: true },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return this.formatContentResponse(content);
  }

  async deleteContent(id: string) {
    const content = await this.prisma.cmsContent.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException(`Content #${id} not found`);
    }

    await this.prisma.cmsContent.delete({
      where: { id },
    });

    return { message: "Content deleted successfully" };
  }

  async publishContent(id: string) {
    const content = await this.prisma.cmsContent.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException(`Content #${id} not found`);
    }

    if (content.status === "PUBLISHED") {
      throw new BadRequestException("Content is already published");
    }

    const updated = await this.prisma.cmsContent.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return this.formatContentResponse(updated);
  }

  async unpublishContent(id: string) {
    const content = await this.prisma.cmsContent.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException(`Content #${id} not found`);
    }

    const updated = await this.prisma.cmsContent.update({
      where: { id },
      data: {
        status: "DRAFT",
        publishedAt: null,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return this.formatContentResponse(updated);
  }

  async findContentBySlug(slug: string) {
    const content = await this.prisma.cmsContent.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
        product: true,
        userProfile: {
          select: { id: true, name: true, avatar: true },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundException("Content not found");
    }

    return this.formatContentResponse(content);
  }

  // ==================== 快捷查询 ====================

  async getArticles(query: QueryCmsContentDto) {
    return this.findAllContents({ ...query, contentType: "ARTICLE" });
  }

  async getCases(query: QueryCmsContentDto) {
    return this.findAllContents({ ...query, contentType: "CASE_STUDY" });
  }

  async getProductShowcases(query: QueryCmsContentDto) {
    return this.findAllContents({ ...query, contentType: "PRODUCT_SHOWCASE" });
  }

  async getProfiles(query: QueryCmsContentDto) {
    return this.findAllContents({ ...query, contentType: "PROFILE" });
  }

  // ==================== 标签管理 ====================

  async createTag(createCmsTagDto: CreateCmsTagDto) {
    // 检查 slug 是否重复
    const existing = await this.prisma.cmsTag.findUnique({
      where: { slug: createCmsTagDto.slug },
    });
    if (existing) {
      throw new BadRequestException("标签URL别名已存在");
    }

    // 检查名称是否重复
    const nameExists = await this.prisma.cmsTag.findUnique({
      where: { name: createCmsTagDto.name },
    });
    if (nameExists) {
      throw new BadRequestException("标签名称已存在");
    }

    return this.prisma.cmsTag.create({
      data: createCmsTagDto,
    });
  }

  async findAllTags() {
    const tags = await this.prisma.cmsTag.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { contents: true },
        },
      },
    });

    return tags.map((tag) => ({
      ...tag,
      contentCount: tag._count.contents,
    }));
  }

  async findOneTag(id: string) {
    const tag = await this.prisma.cmsTag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { contents: true },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag #${id} not found`);
    }

    return {
      ...tag,
      contentCount: tag._count.contents,
    };
  }

  async updateTag(id: string, updateCmsTagDto: UpdateCmsTagDto) {
    const tag = await this.prisma.cmsTag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException(`Tag #${id} not found`);
    }

    // 如果更新 slug，检查是否重复
    if (updateCmsTagDto.slug && updateCmsTagDto.slug !== tag.slug) {
      const slugExists = await this.prisma.cmsTag.findUnique({
        where: { slug: updateCmsTagDto.slug },
      });
      if (slugExists) {
        throw new BadRequestException("标签URL别名已存在");
      }
    }

    // 如果更新名称，检查是否重复
    if (updateCmsTagDto.name && updateCmsTagDto.name !== tag.name) {
      const nameExists = await this.prisma.cmsTag.findUnique({
        where: { name: updateCmsTagDto.name },
      });
      if (nameExists) {
        throw new BadRequestException("标签名称已存在");
      }
    }

    return this.prisma.cmsTag.update({
      where: { id },
      data: updateCmsTagDto,
    });
  }

  async deleteTag(id: string) {
    const tag = await this.prisma.cmsTag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { contents: true },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag #${id} not found`);
    }

    if (tag._count.contents > 0) {
      throw new BadRequestException(
        "该标签下还有内容，无法删除。请先移除内容关联。",
      );
    }

    await this.prisma.cmsTag.delete({
      where: { id },
    });

    return { message: "Tag deleted successfully" };
  }

  // ==================== 辅助方法 ====================

  private validateContentTypeRelations(
    contentType: string,
    productId?: string,
    userId?: string,
  ) {
    switch (contentType) {
      case "PRODUCT_SHOWCASE":
        if (!productId) {
          throw new BadRequestException("产品展示类型必须指定关联的产品");
        }
        if (userId) {
          throw new BadRequestException("产品展示类型不应指定关联的用户");
        }
        break;
      case "PROFILE":
        if (!userId) {
          throw new BadRequestException("人员介绍类型必须指定关联的用户");
        }
        if (productId) {
          throw new BadRequestException("人员介绍类型不应指定关联的产品");
        }
        break;
      case "ARTICLE":
      case "CASE_STUDY":
        if (productId) {
          throw new BadRequestException(
            `${contentType} 类型不应指定关联的产品`,
          );
        }
        if (userId) {
          throw new BadRequestException(
            `${contentType} 类型不应指定关联的用户`,
          );
        }
        break;
    }
  }

  private formatContentResponse(content: any) {
    return {
      ...content,
      tags: content.tags?.map((ct: any) => ct.tag) || [],
    };
  }
}
