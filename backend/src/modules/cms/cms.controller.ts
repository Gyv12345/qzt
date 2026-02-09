import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CmsService } from "./cms.service";
import { CreateCmsContentDto } from "./dto/create-cms-content.dto";
import { UpdateCmsContentDto } from "./dto/update-cms-content.dto";
import { QueryCmsContentDto } from "./dto/query-cms-content.dto";
import { CreateCmsTagDto } from "./dto/create-cms-tag.dto";
import { UpdateCmsTagDto } from "./dto/update-cms-tag.dto";
import { CreateCmsPageDto } from "./dto/create-cms-page.dto";
import { UpdateCmsPageDto } from "./dto/update-cms-page.dto";
import { QueryCmsPageDto } from "./dto/query-cms-page.dto";

@ApiTags("cms") // 使用英文标签，避免跨平台问题
@Controller("cms")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  // ==================== 内容管理 ====================

  @Post("contents")
  @ApiOperation({ summary: "创建内容" })
  createContent(
    @Body() createCmsContentDto: CreateCmsContentDto,
    @Request() req,
  ) {
    // 从 JWT 中获取用户 ID 作为作者
    const authorId = req.user?.id || req.user?.userId;
    return this.cmsService.createContent(createCmsContentDto, authorId);
  }

  @Get("contents")
  @ApiOperation({ summary: "获取内容列表" })
  findAllContents(@Query() query: QueryCmsContentDto) {
    return this.cmsService.findAllContents(query);
  }

  @Get("contents/:id")
  @ApiOperation({ summary: "获取内容详情" })
  findOneContent(@Param("id") id: string) {
    return this.cmsService.findOneContent(id);
  }

  @Patch("contents/:id")
  @ApiOperation({ summary: "更新内容" })
  updateContent(
    @Param("id") id: string,
    @Body() updateCmsContentDto: UpdateCmsContentDto,
  ) {
    return this.cmsService.updateContent(id, updateCmsContentDto);
  }

  @Delete("contents/:id")
  @ApiOperation({ summary: "删除内容" })
  deleteContent(@Param("id") id: string) {
    return this.cmsService.deleteContent(id);
  }

  @Post("contents/:id/publish")
  @ApiOperation({ summary: "发布内容" })
  publishContent(@Param("id") id: string) {
    return this.cmsService.publishContent(id);
  }

  @Post("contents/:id/unpublish")
  @ApiOperation({ summary: "取消发布内容" })
  unpublishContent(@Param("id") id: string) {
    return this.cmsService.unpublishContent(id);
  }

  // ==================== 快捷查询 ====================

  @Get("articles")
  @ApiOperation({ summary: "获取文章列表" })
  getArticles(@Query() query: QueryCmsContentDto) {
    return this.cmsService.getArticles(query);
  }

  @Get("cases")
  @ApiOperation({ summary: "获取案例列表" })
  getCases(@Query() query: QueryCmsContentDto) {
    return this.cmsService.getCases(query);
  }

  @Get("product-showcases")
  @ApiOperation({ summary: "获取产品展示列表" })
  getProductShowcases(@Query() query: QueryCmsContentDto) {
    return this.cmsService.getProductShowcases(query);
  }

  @Get("profiles")
  @ApiOperation({ summary: "获取人员介绍列表" })
  getProfiles(@Query() query: QueryCmsContentDto) {
    return this.cmsService.getProfiles(query);
  }

  @Get("page-elements")
  @ApiOperation({ summary: "获取页面元素列表" })
  getPageElements(@Query() query: QueryCmsContentDto) {
    return this.cmsService.getPageElements(query);
  }

  // ==================== 标签管理 ====================

  @Get("tags")
  @ApiOperation({ summary: "获取所有标签" })
  findAllTags() {
    return this.cmsService.findAllTags();
  }

  @Get("tags/:id")
  @ApiOperation({ summary: "获取标签详情" })
  findOneTag(@Param("id") id: string) {
    return this.cmsService.findOneTag(id);
  }

  @Post("tags")
  @ApiOperation({ summary: "创建标签" })
  createTag(@Body() createCmsTagDto: CreateCmsTagDto) {
    return this.cmsService.createTag(createCmsTagDto);
  }

  @Patch("tags/:id")
  @ApiOperation({ summary: "更新标签" })
  updateTag(@Param("id") id: string, @Body() updateCmsTagDto: UpdateCmsTagDto) {
    return this.cmsService.updateTag(id, updateCmsTagDto);
  }

  @Delete("tags/:id")
  @ApiOperation({ summary: "删除标签" })
  deleteTag(@Param("id") id: string) {
    return this.cmsService.deleteTag(id);
  }

  // ==================== 页面管理 ====================

  @Post("pages")
  @ApiOperation({ summary: "创建页面" })
  createPage(@Body() createCmsPageDto: CreateCmsPageDto) {
    return this.cmsService.createPage(createCmsPageDto);
  }

  @Get("pages")
  @ApiOperation({ summary: "获取页面列表" })
  findAllPages(@Query() query: QueryCmsPageDto) {
    return this.cmsService.findAllPages(query);
  }

  @Get("pages/:id")
  @ApiOperation({ summary: "获取页面详情" })
  findOnePage(@Param("id") id: string) {
    return this.cmsService.findOnePage(id);
  }

  @Patch("pages/:id")
  @ApiOperation({ summary: "更新页面" })
  updatePage(
    @Param("id") id: string,
    @Body() updateCmsPageDto: UpdateCmsPageDto,
  ) {
    return this.cmsService.updatePage(id, updateCmsPageDto);
  }

  @Delete("pages/:id")
  @ApiOperation({ summary: "删除页面" })
  deletePage(@Param("id") id: string) {
    return this.cmsService.deletePage(id);
  }

  @Post("pages/:id/publish")
  @ApiOperation({ summary: "发布页面" })
  publishPage(@Param("id") id: string) {
    return this.cmsService.publishPage(id);
  }

  @Post("pages/:id/unpublish")
  @ApiOperation({ summary: "取消发布页面" })
  unpublishPage(@Param("id") id: string) {
    return this.cmsService.unpublishPage(id);
  }
}
