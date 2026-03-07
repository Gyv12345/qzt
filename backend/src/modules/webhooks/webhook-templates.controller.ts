import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { WebhookTemplatesService } from "./webhook-templates.service";
import {
  CreateWebhookTemplateDto,
  UpdateWebhookTemplateDto,
  SendTemplateDto,
  PreviewTemplateDto,
} from "./dto/webhook-template.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("webhook-templates")
@Controller("webhook/templates")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhookTemplatesController {
  constructor(
    private readonly templatesService: WebhookTemplatesService,
  ) {}

  @Post()
  @ApiOperation({ summary: "创建消息模板" })
  async create(@Body() createDto: CreateWebhookTemplateDto) {
    const template = await this.templatesService.create(createDto);
    return {
      success: true,
      data: template,
      message: "创建成功",
    };
  }

  @Get()
  @ApiOperation({ summary: "获取消息模板列表" })
  async findAll(
    @Query("platform") platform?: string,
    @Query("enabled") enabled?: string,
  ) {
    const templates = await this.templatesService.findAll({
      platform,
      enabled: enabled === "true" ? true : enabled === "false" ? false : undefined,
    });
    return {
      success: true,
      data: templates,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "获取消息模板详情" })
  async findOne(@Param("id") id: string) {
    const template = await this.templatesService.findOne(id);
    return {
      success: true,
      data: template,
    };
  }

  @Get("code/:code")
  @ApiOperation({ summary: "根据代码获取消息模板" })
  async findByCode(@Param("code") code: string) {
    const template = await this.templatesService.findByCode(code);
    return {
      success: true,
      data: template,
    };
  }

  @Put(":id")
  @ApiOperation({ summary: "更新消息模板" })
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateWebhookTemplateDto,
  ) {
    const template = await this.templatesService.update(id, updateDto);
    return {
      success: true,
      data: template,
      message: "更新成功",
    };
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除消息模板" })
  async remove(@Param("id") id: string) {
    await this.templatesService.remove(id);
    return {
      success: true,
      message: "删除成功",
    };
  }

  @Patch(":id/toggle")
  @ApiOperation({ summary: "切换消息模板启用状态" })
  async toggle(@Param("id") id: string) {
    const template = await this.templatesService.toggle(id);
    return {
      success: true,
      data: template,
      message: `模板已${template.enabled ? "启用" : "禁用"}`,
    };
  }

  @Post("preview")
  @ApiOperation({ summary: "预览模板渲染结果" })
  async preview(@Body() previewDto: PreviewTemplateDto) {
    const result = await this.templatesService.preview(previewDto);
    return {
      success: true,
      data: result,
    };
  }

  @Post("send")
  @ApiOperation({ summary: "使用模板发送消息" })
  async sendWithTemplate(@Body() sendDto: SendTemplateDto) {
    const result = await this.templatesService.sendWithTemplate(sendDto);
    return {
      success: result.success,
      message: result.message,
      data: result.results,
    };
  }

  @Post("init-defaults")
  @ApiOperation({ summary: "初始化默认模板" })
  async initDefaults() {
    await this.templatesService.initDefaultTemplates();
    return {
      success: true,
      message: "默认模板初始化完成",
    };
  }
}
