import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ContactService } from "./contact.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";
import { QueryContactDto } from "./dto/query-contact.dto";
import { LinkCompanyDto } from "./dto/link-company.dto";
import { SubmitContactDto } from "./dto/submit-contact.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DataScopeGuard } from "../roles/guards/data-scope.guard";
import { DataScope } from "../roles/decorators/data-scope.decorator";

@ApiTags("contacts")
@Controller("contacts")
@UseGuards(JwtAuthGuard, DataScopeGuard)
@ApiBearerAuth()
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: "创建联系人" })
  create(@Body() createContactDto: CreateContactDto, @Request() req) {
    return this.contactService.create(createContactDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: "查询联系人列表" })
  @DataScope("contact")
  findAll(@Query() query: QueryContactDto, @Request() req) {
    return this.contactService.findAll(query, req.dataScope);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取联系人详情" })
  @DataScope("contact")
  findOne(@Param("id") id: string, @Request() req) {
    return this.contactService.findOne(id, req.dataScope);
  }

  @Get("phone/:phone")
  @ApiOperation({ summary: "通过手机号查找联系人" })
  findByPhone(@Param("phone") phone: string) {
    return this.contactService.findByPhone(phone);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新联系人" })
  @DataScope("contact")
  update(
    @Param("id") id: string,
    @Body() updateContactDto: UpdateContactDto,
    @Request() req,
  ) {
    return this.contactService.update(id, updateContactDto, req.dataScope);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "删除联系人" })
  @DataScope("contact")
  remove(@Param("id") id: string, @Request() req) {
    return this.contactService.remove(id, req.dataScope);
  }

  @Post(":id/companies")
  @ApiOperation({ summary: "关联公司" })
  @DataScope("contact")
  linkCompany(
    @Param("id") id: string,
    @Body() linkDto: LinkCompanyDto,
    @Request() req,
  ) {
    return this.contactService.linkCompany(id, linkDto, req.dataScope);
  }

  @Delete(":id/companies/:customerId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "取消关联公司" })
  @DataScope("contact")
  unlinkCompany(
    @Param("id") id: string,
    @Param("customerId") customerId: string,
    @Request() req,
  ) {
    return this.contactService.unlinkCompany(id, customerId, req.dataScope);
  }
}

// 公开 API - 不需要认证
@ApiTags("public-contact")
@Controller("public/contact")
export class PublicContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post("submit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "提交联系表单（公开接口）" })
  async submit(@Body() submitContactDto: SubmitContactDto) {
    return this.contactService.submitContactForm(submitContactDto);
  }
}
