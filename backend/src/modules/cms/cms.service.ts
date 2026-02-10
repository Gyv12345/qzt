import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateCmsContentDto } from "./dto/create-cms-content.dto";
import { UpdateCmsContentDto } from "./dto/update-cms-content.dto";
import { QueryCmsContentDto } from "./dto/query-cms-content.dto";
import { CreateCmsTagDto } from "./dto/create-cms-tag.dto";
import { UpdateCmsTagDto } from "./dto/update-cms-tag.dto";
import { CreateCmsPageDto } from "./dto/create-cms-page.dto";
import { UpdateCmsPageDto } from "./dto/update-cms-page.dto";

// 预览令牌有效期（30分钟）
const PREVIEW_TOKEN_EXPIRY_MINUTES = 30;

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService) {}

  // ==================== 内容管理 ====================

  async createContent(
    createCmsContentDto: CreateCmsContentDto,
    authorId: string,
  ) {
    const { tagIds, ...data } = createCmsContentDto;

    // 将空字符串转换为 null（处理外键约束）
    const cleanData = {
      ...data,
      productId: data.productId || null,
      userId: data.userId || null,
      contractId: data.contractId || null,
    };

    // 验证内容类型与关联字段的一致性
    this.validateContentTypeRelations(
      cleanData.contentType,
      cleanData.productId,
      cleanData.userId,
      cleanData.contractId,
    );

    // 检查 slug 是否重复
    const existing = await this.prisma.cmsContent.findUnique({
      where: { slug: cleanData.slug },
    });
    if (existing) {
      throw new BadRequestException("URL别名已存在");
    }

    // 创建内容
    const content = await this.prisma.cmsContent.create({
      data: {
        ...cleanData,
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
        contract: {
          select: {
            id: true,
            contractNo: true,
            customer: {
              select: { id: true, name: true, shortName: true },
            },
          },
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
          contract: {
            select: {
              id: true,
              contractNo: true,
              customer: {
                select: { id: true, name: true, shortName: true },
              },
            },
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
        contract: {
          select: {
            id: true,
            contractNo: true,
            totalAmount: true,
            customer: {
              select: { id: true, name: true, shortName: true },
            },
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
      data.productId !== undefined
        ? data.productId || null
        : existing.productId;
    const userId =
      data.userId !== undefined ? data.userId || null : existing.userId;
    const contractId =
      data.contractId !== undefined
        ? data.contractId || null
        : existing.contractId;
    this.validateContentTypeRelations(
      contentType,
      productId,
      userId,
      contractId,
    );

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

    // 将空字符串转换为 null
    const updateData = {
      ...data,
      ...(data.productId !== undefined && {
        productId: data.productId || null,
      }),
      ...(data.userId !== undefined && { userId: data.userId || null }),
      ...(data.contractId !== undefined && {
        contractId: data.contractId || null,
      }),
    };

    const content = await this.prisma.cmsContent.update({
      where: { id },
      data: {
        ...updateData,
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
        contract: {
          select: {
            id: true,
            contractNo: true,
            customer: {
              select: { id: true, name: true, shortName: true },
            },
          },
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

  async getPageElements(query: QueryCmsContentDto) {
    return this.findAllContents({ ...query, contentType: "PAGE_ELEMENT" });
  }

  async getPageElementBySlug(slug: string) {
    const content = await this.prisma.cmsContent.findFirst({
      where: {
        slug,
        contentType: "PAGE_ELEMENT",
        status: "PUBLISHED",
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundException("Page element not found");
    }

    return this.formatContentResponse(content);
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
    contractId?: string,
  ) {
    switch (contentType) {
      case "PRODUCT_SHOWCASE":
        if (!productId) {
          throw new BadRequestException("产品展示类型必须指定关联的产品");
        }
        if (userId || contractId) {
          throw new BadRequestException("产品展示类型不应指定关联的用户或合同");
        }
        break;
      case "PROFILE":
        if (!userId) {
          throw new BadRequestException("人员介绍类型必须指定关联的用户");
        }
        if (productId || contractId) {
          throw new BadRequestException("人员介绍类型不应指定关联的产品或合同");
        }
        break;
      case "CASE_STUDY":
        // 案例类型可以关联合同，但不应该关联产品或用户
        if (productId || userId) {
          throw new BadRequestException("案例类型不应指定关联的产品或用户");
        }
        // contractId 是可选的，如果提供则验证合同存在
        if (contractId) {
          // 验证合同是否存在（可选，为了更好的用户体验）
          // 这里简单验证即可，详细验证可以在调用方进行
        }
        break;
      case "ARTICLE":
      case "PAGE_ELEMENT":
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
        if (contractId) {
          throw new BadRequestException(
            `${contentType} 类型不应指定关联的合同`,
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

  // ==================== 页面管理 ====================

  async createPage(createCmsPageDto: any) {
    const { elements, ...data } = createCmsPageDto;

    // 检查 slug 是否重复
    const existing = await this.prisma.cmsPage.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      throw new BadRequestException("页面URL路径已存在");
    }

    // 创建页面
    const page = await this.prisma.cmsPage.create({
      data: {
        ...data,
        ...(elements && {
          elements: {
            create: elements,
          },
        }),
      },
      include: {
        elements: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return page;
  }

  async findAllPages(query: any) {
    const { page = 1, pageSize = 10, keyword, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [total, pages] = await Promise.all([
      this.prisma.cmsPage.count({ where }),
      this.prisma.cmsPage.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          elements: {
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
    ]);

    return {
      total,
      data: pages,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOnePage(id: string) {
    const page = await this.prisma.cmsPage.findUnique({
      where: { id },
      include: {
        elements: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!page) {
      throw new NotFoundException(`Page #${id} not found`);
    }

    return page;
  }

  async findPageBySlug(slug: string) {
    const page = await this.prisma.cmsPage.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
      },
      include: {
        elements: {
          where: { visible: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!page) {
      throw new NotFoundException("Page not found");
    }

    return page;
  }

  async updatePage(id: string, updateCmsPageDto: any) {
    const { elements, ...data } = updateCmsPageDto;

    // 验证页面是否存在
    const existing = await this.prisma.cmsPage.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Page #${id} not found`);
    }

    // 如果更新 slug，检查是否重复
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await this.prisma.cmsPage.findUnique({
        where: { slug: data.slug },
      });
      if (slugExists) {
        throw new BadRequestException("页面URL路径已存在");
      }
    }

    // 更新元素
    if (elements !== undefined) {
      // 删除旧元素
      await this.prisma.cmsPageElement.deleteMany({
        where: { pageId: id },
      });
    }

    const page = await this.prisma.cmsPage.update({
      where: { id },
      data: {
        ...data,
        ...(elements !== undefined && {
          elements: {
            create: elements,
          },
        }),
      },
      include: {
        elements: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return page;
  }

  async deletePage(id: string) {
    const page = await this.prisma.cmsPage.findUnique({
      where: { id },
    });

    if (!page) {
      throw new NotFoundException(`Page #${id} not found`);
    }

    await this.prisma.cmsPage.delete({
      where: { id },
    });

    return { message: "Page deleted successfully" };
  }

  async publishPage(id: string) {
    const page = await this.prisma.cmsPage.findUnique({
      where: { id },
    });

    if (!page) {
      throw new NotFoundException(`Page #${id} not found`);
    }

    if (page.status === "PUBLISHED") {
      throw new BadRequestException("Page is already published");
    }

    return this.prisma.cmsPage.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
  }

  async unpublishPage(id: string) {
    const page = await this.prisma.cmsPage.findUnique({
      where: { id },
    });

    if (!page) {
      throw new NotFoundException(`Page #${id} not found`);
    }

    return this.prisma.cmsPage.update({
      where: { id },
      data: {
        status: "DRAFT",
        publishedAt: null,
      },
    });
  }

  // ==================== 预览功能 ====================

  /**
   * 生成内容预览令牌
   */
  async generateContentPreviewToken(contentId: string) {
    const content = await this.prisma.cmsContent.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content #${contentId} not found`);
    }

    // 生成随机令牌
    const token = randomBytes(32).toString("hex");

    // 计算过期时间（30分钟后）
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + PREVIEW_TOKEN_EXPIRY_MINUTES);

    // 清理该内容的旧令牌
    await this.prisma.cmsContentPreviewToken.deleteMany({
      where: { contentId },
    });

    // 创建新令牌
    const previewToken = await this.prisma.cmsContentPreviewToken.create({
      data: {
        contentId,
        token,
        expiresAt,
      },
    });

    return {
      token: previewToken.token,
      previewUrl: `/public/cms/preview/contents/${previewToken.token}`,
      expiresAt: previewToken.expiresAt.toISOString(),
      expiresAtTimestamp: previewToken.expiresAt.getTime(),
    };
  }

  /**
   * 生成页面预览令牌
   */
  async generatePagePreviewToken(pageId: string) {
    const page = await this.prisma.cmsPage.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      throw new NotFoundException(`Page #${pageId} not found`);
    }

    // 生成随机令牌
    const token = randomBytes(32).toString("hex");

    // 计算过期时间（30分钟后）
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + PREVIEW_TOKEN_EXPIRY_MINUTES);

    // 清理该页面的旧令牌
    await this.prisma.cmsPagePreviewToken.deleteMany({
      where: { pageId },
    });

    // 创建新令牌
    const previewToken = await this.prisma.cmsPagePreviewToken.create({
      data: {
        pageId,
        token,
        expiresAt,
      },
    });

    return {
      token: previewToken.token,
      previewUrl: `/public/cms/preview/pages/${previewToken.token}`,
      expiresAt: previewToken.expiresAt.toISOString(),
      expiresAtTimestamp: previewToken.expiresAt.getTime(),
    };
  }

  /**
   * 通过令牌获取内容预览
   */
  async getContentByPreviewToken(token: string) {
    const previewToken = await this.prisma.cmsContentPreviewToken.findUnique({
      where: { token },
      include: {
        content: {
          include: {
            author: {
              select: { id: true, name: true },
            },
            product: true,
            userProfile: {
              select: { id: true, name: true, avatar: true },
            },
            contract: {
              select: {
                id: true,
                contractNo: true,
                customer: {
                  select: { id: true, name: true, shortName: true },
                },
              },
            },
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });

    if (!previewToken) {
      throw new NotFoundException("Invalid preview token");
    }

    // 检查是否过期
    if (previewToken.expiresAt < new Date()) {
      throw new BadRequestException("Preview token has expired");
    }

    return this.formatContentResponse(previewToken.content);
  }

  /**
   * 通过令牌获取页面预览
   */
  async getPageByPreviewToken(token: string) {
    const previewToken = await this.prisma.cmsPagePreviewToken.findUnique({
      where: { token },
      include: {
        page: {
          include: {
            elements: {
              where: { visible: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!previewToken) {
      throw new NotFoundException("Invalid preview token");
    }

    // 检查是否过期
    if (previewToken.expiresAt < new Date()) {
      throw new BadRequestException("Preview token has expired");
    }

    return previewToken.page;
  }

  // ==================== 版本控制 ====================

  /**
   * 创建内容版本快照
   */
  async createContentVersion(
    contentId: string,
    userId: string,
    changeNote?: string,
  ) {
    const content = await this.prisma.cmsContent.findUnique({
      where: { id: contentId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundException(`Content #${contentId} not found`);
    }

    // 获取当前最大版本号
    const latestVersion = await this.prisma.cmsContentVersion.findFirst({
      where: { contentId },
      orderBy: { version: "desc" },
    });

    const newVersionNumber = (latestVersion?.version || 0) + 1;

    // 创建新版本
    const newVersion = await this.prisma.cmsContentVersion.create({
      data: {
        contentId,
        version: newVersionNumber,
        title: content.title,
        slug: content.slug,
        content: content.content,
        excerpt: content.excerpt,
        coverImage: content.coverImage,
        status: content.status,
        contentType: content.contentType,
        productId: content.productId,
        userId: content.userId,
        contractId: content.contractId,
        metaTitle: content.metaTitle,
        metaDesc: content.metaDesc,
        keywords: content.keywords,
        tagSnapshot: JSON.stringify(
          content.tags.map((ct) => ({
            id: ct.tag.id,
            name: ct.tag.name,
            slug: ct.tag.slug,
            color: ct.tag.color,
          })),
        ),
        createdBy: userId,
        changeNote,
      },
    });

    // 清理旧版本（保留最近50个）
    const allVersions = await this.prisma.cmsContentVersion.findMany({
      where: { contentId },
      orderBy: { version: "desc" },
    });

    if (allVersions.length > 50) {
      const toDelete = allVersions.slice(50);
      await this.prisma.cmsContentVersion.deleteMany({
        where: {
          id: { in: toDelete.map((v) => v.id) },
        },
      });
    }

    return newVersion;
  }

  /**
   * 获取内容版本历史
   */
  async getContentVersions(contentId: string) {
    const versions = await this.prisma.cmsContentVersion.findMany({
      where: { contentId },
      orderBy: { version: "desc" },
      take: 50,
    });

    return versions.map((v) => ({
      id: v.id,
      version: v.version,
      title: v.title,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      changeNote: v.changeNote,
      status: v.status,
    }));
  }

  /**
   * 获取特定版本详情
   */
  async getContentVersionDetail(versionId: string) {
    const version = await this.prisma.cmsContentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Version #${versionId} not found`);
    }

    return {
      ...version,
      tagSnapshot: version.tagSnapshot ? JSON.parse(version.tagSnapshot) : [],
    };
  }

  /**
   * 恢复到指定版本
   */
  async restoreContentVersion(
    contentId: string,
    versionId: string,
    userId: string,
    changeNote?: string,
  ) {
    // 验证版本存在且属于该内容
    const version = await this.prisma.cmsContentVersion.findFirst({
      where: {
        id: versionId,
        contentId,
      },
    });

    if (!version) {
      throw new NotFoundException(
        `Version #${versionId} not found for content #${contentId}`,
      );
    }

    // 先创建当前状态的版本快照
    await this.createContentVersion(
      contentId,
      userId,
      `恢复前快照: ${changeNote || ""}`,
    );

    // 恢复内容
    const updatedContent = await this.prisma.cmsContent.update({
      where: { id: contentId },
      data: {
        title: version.title,
        slug: version.slug,
        content: version.content,
        excerpt: version.excerpt,
        coverImage: version.coverImage,
        status: "DRAFT", // 恢复后自动设为草稿
        productId: version.productId,
        userId: version.userId,
        contractId: version.contractId,
        metaTitle: version.metaTitle,
        metaDesc: version.metaDesc,
        keywords: version.keywords,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return this.formatContentResponse(updatedContent);
  }

  // ==================== 批量操作 ====================

  /**
   * 批量发布内容
   */
  async batchPublishContents(ids: string[]) {
    const results = {
      success: 0,
      failed: 0,
      failedIds: [] as string[],
      message: "",
    };

    for (const id of ids) {
      try {
        await this.publishContent(id);
        results.success++;
      } catch (error) {
        results.failed++;
        results.failedIds.push(id);
      }
    }

    results.message = `批量发布完成: 成功 ${results.success}，失败 ${results.failed}`;
    return results;
  }

  /**
   * 批量取消发布内容
   */
  async batchUnpublishContents(ids: string[]) {
    const results = {
      success: 0,
      failed: 0,
      failedIds: [] as string[],
      message: "",
    };

    for (const id of ids) {
      try {
        await this.unpublishContent(id);
        results.success++;
      } catch (error) {
        results.failed++;
        results.failedIds.push(id);
      }
    }

    results.message = `批量取消发布完成: 成功 ${results.success}，失败 ${results.failed}`;
    return results;
  }

  /**
   * 批量删除内容
   */
  async batchDeleteContents(ids: string[]) {
    const results = {
      success: 0,
      failed: 0,
      failedIds: [] as string[],
      message: "",
    };

    for (const id of ids) {
      try {
        await this.deleteContent(id);
        results.success++;
      } catch (error) {
        results.failed++;
        results.failedIds.push(id);
      }
    }

    results.message = `批量删除完成: 成功 ${results.success}，失败 ${results.failed}`;
    return results;
  }

  /**
   * 批量归档内容
   */
  async batchArchiveContents(ids: string[]) {
    const results = {
      success: 0,
      failed: 0,
      failedIds: [] as string[],
      message: "",
    };

    for (const id of ids) {
      try {
        await this.prisma.cmsContent.update({
          where: { id },
          data: { status: "ARCHIVED" },
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.failedIds.push(id);
      }
    }

    results.message = `批量归档完成: 成功 ${results.success}，失败 ${results.failed}`;
    return results;
  }

  /**
   * 批量发布页面
   */
  async batchPublishPages(ids: string[]) {
    const results = {
      success: 0,
      failed: 0,
      failedIds: [] as string[],
      message: "",
    };

    for (const id of ids) {
      try {
        await this.publishPage(id);
        results.success++;
      } catch (error) {
        results.failed++;
        results.failedIds.push(id);
      }
    }

    results.message = `批量发布完成: 成功 ${results.success}，失败 ${results.failed}`;
    return results;
  }

  /**
   * 批量取消发布页面
   */
  async batchUnpublishPages(ids: string[]) {
    const results = {
      success: 0,
      failed: 0,
      failedIds: [] as string[],
      message: "",
    };

    for (const id of ids) {
      try {
        await this.unpublishPage(id);
        results.success++;
      } catch (error) {
        results.failed++;
        results.failedIds.push(id);
      }
    }

    results.message = `批量取消发布完成: 成功 ${results.success}，失败 ${results.failed}`;
    return results;
  }

  /**
   * 批量删除页面
   */
  async batchDeletePages(ids: string[]) {
    const results = {
      success: 0,
      failed: 0,
      failedIds: [] as string[],
      message: "",
    };

    for (const id of ids) {
      try {
        await this.deletePage(id);
        results.success++;
      } catch (error) {
        results.failed++;
        results.failedIds.push(id);
      }
    }

    results.message = `批量删除完成: 成功 ${results.success}，失败 ${results.failed}`;
    return results;
  }
}
