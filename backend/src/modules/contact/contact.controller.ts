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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryContactDto } from './dto/query-contact.dto';
import { LinkCompanyDto } from './dto/link-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: '创建联系人' })
  create(@Body() createContactDto: CreateContactDto) {
    return this.contactService.create(createContactDto);
  }

  @Get()
  @ApiOperation({ summary: '查询联系人列表' })
  findAll(@Query() query: QueryContactDto) {
    return this.contactService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取联系人详情' })
  findOne(@Param('id') id: string) {
    return this.contactService.findOne(id);
  }

  @Get('phone/:phone')
  @ApiOperation({ summary: '通过手机号查找联系人' })
  findByPhone(@Param('phone') phone: string) {
    return this.contactService.findByPhone(phone);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新联系人' })
  update(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    return this.contactService.update(id, updateContactDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除联系人' })
  remove(@Param('id') id: string) {
    return this.contactService.remove(id);
  }

  @Post(':id/companies')
  @ApiOperation({ summary: '关联公司' })
  linkCompany(
    @Param('id') id: string,
    @Body() linkDto: LinkCompanyDto,
  ) {
    return this.contactService.linkCompany(id, linkDto);
  }

  @Delete(':id/companies/:customerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '取消关联公司' })
  unlinkCompany(
    @Param('id') id: string,
    @Param('customerId') customerId: string,
  ) {
    return this.contactService.unlinkCompany(id, customerId);
  }
}
