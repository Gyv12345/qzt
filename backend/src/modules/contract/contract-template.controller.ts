import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ContractTemplateService } from "./contract-template.service";
import { CreateContractTemplateDto } from "./dto/create-contract-template.dto";
import { UpdateContractTemplateDto } from "./dto/update-contract-template.dto";
import { PreviewContractTemplateDto } from "./dto/preview-contract-template.dto";

@ApiTags("contract-templates")
@Controller("contract-templates")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContractTemplateController {
  constructor(
    private readonly contractTemplateService: ContractTemplateService,
  ) {}

  @Get()
  @ApiOperation({ summary: "获取所有合同模板" })
  findAll() {
    return this.contractTemplateService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "获取模板详情" })
  findOne(@Param("id") id: string) {
    return this.contractTemplateService.findOne(id);
  }

  @Get(":id/variables")
  @ApiOperation({ summary: "获取模板变量定义" })
  getVariables(@Param("id") id: string) {
    return this.contractTemplateService.getVariables(id);
  }

  @Post(":id/preview")
  @ApiOperation({ summary: "预览合同（替换变量）" })
  preview(
    @Param("id") id: string,
    @Body() previewDto: PreviewContractTemplateDto,
  ) {
    return this.contractTemplateService.preview(id, previewDto.variables);
  }

  @Post()
  @ApiOperation({ summary: "创建合同模板" })
  create(@Body() createDto: CreateContractTemplateDto) {
    return this.contractTemplateService.create(createDto);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新合同模板" })
  update(
    @Param("id") id: string,
    @Body() updateDto: UpdateContractTemplateDto,
  ) {
    return this.contractTemplateService.update(id, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除合同模板" })
  remove(@Param("id") id: string) {
    return this.contractTemplateService.remove(id);
  }
}
