import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { CmsService } from "./cms.service";
import { QueryCmsContentDto } from "./dto/query-cms-content.dto";

@ApiTags("public-cms")
@Controller("public/cms")
export class CmsPublicController {
  constructor(private readonly cmsService: CmsService) {}

  @Get("contents")
  @ApiOperation({ summary: "Get published content list" })
  findPublishedContents(@Query() query: QueryCmsContentDto) {
    return this.cmsService.findAllContents({
      ...query,
      status: "PUBLISHED",
    });
  }

  @Get("contents/:slug")
  @ApiOperation({ summary: "Get content by slug" })
  findContentBySlug(@Param("slug") slug: string) {
    return this.cmsService.findContentBySlug(slug);
  }

  @Get("articles")
  @ApiOperation({ summary: "Get published articles" })
  getPublishedArticles(@Query() query: QueryCmsContentDto) {
    return this.cmsService.getArticles({
      ...query,
      status: "PUBLISHED",
    });
  }

  @Get("cases")
  @ApiOperation({ summary: "Get published case studies" })
  getPublishedCases(@Query() query: QueryCmsContentDto) {
    return this.cmsService.getCases({
      ...query,
      status: "PUBLISHED",
    });
  }

  @Get("product-showcases")
  @ApiOperation({ summary: "Get published product showcases" })
  getPublishedShowcases(@Query() query: QueryCmsContentDto) {
    return this.cmsService.getProductShowcases({
      ...query,
      status: "PUBLISHED",
    });
  }

  @Get("profiles")
  @ApiOperation({ summary: "Get published user profiles" })
  getPublishedProfiles(@Query() query: QueryCmsContentDto) {
    return this.cmsService.getProfiles({
      ...query,
      status: "PUBLISHED",
    });
  }

  @Get("page-elements")
  @ApiOperation({ summary: "Get published page elements" })
  getPageElements(@Query() query: QueryCmsContentDto) {
    return this.cmsService.getPageElements({
      ...query,
      status: "PUBLISHED",
    });
  }

  @Get("page-elements/:slug")
  @ApiOperation({ summary: "Get page element by slug" })
  getPageElementBySlug(@Param("slug") slug: string) {
    return this.cmsService.getPageElementBySlug(slug);
  }

  @Get("pages/:slug")
  @ApiOperation({ summary: "Get published page by slug" })
  findPageBySlug(@Param("slug") slug: string) {
    return this.cmsService.findPageBySlug(slug);
  }

  @Get("tags")
  @ApiOperation({ summary: "Get all tags" })
  findAllTags() {
    return this.cmsService.findAllTags();
  }

  // ==================== 预览功能 ====================

  @Get("preview/contents/:token")
  @ApiOperation({ summary: "Get content preview by token" })
  getContentPreview(@Param("token") token: string) {
    return this.cmsService.getContentByPreviewToken(token);
  }

  @Get("preview/pages/:token")
  @ApiOperation({ summary: "Get page preview by token" })
  getPagePreview(@Param("token") token: string) {
    return this.cmsService.getPageByPreviewToken(token);
  }
}
