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

  @Get("tags")
  @ApiOperation({ summary: "Get all tags" })
  findAllTags() {
    return this.cmsService.findAllTags();
  }
}
