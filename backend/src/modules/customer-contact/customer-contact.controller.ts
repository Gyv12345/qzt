import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CustomerContactService } from "./customer-contact.service";
import {
  AddContactDto,
  LinkContactDto,
  UpdateContactRoleDto,
} from "./dto/link-contact.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("customer-contacts")
@Controller("customers/:customerId/contacts")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomerContactController {
  constructor(
    private readonly customerContactService: CustomerContactService,
  ) {}

  @Post()
  @ApiOperation({ summary: "为公司添加联系人（不存在则创建）" })
  addContact(
    @Param("customerId") customerId: string,
    @Body() addDto: AddContactDto,
    @Request() req,
  ) {
    return this.customerContactService.addContact(
      customerId,
      addDto,
      req.user.userId,
    );
  }

  @Post("link")
  @ApiOperation({ summary: "关联已有联系人" })
  linkContact(
    @Param("customerId") customerId: string,
    @Body() linkDto: LinkContactDto,
  ) {
    return this.customerContactService.linkContact(customerId, linkDto);
  }

  @Get()
  @ApiOperation({ summary: "获取公司的所有联系人" })
  getCustomerContacts(@Param("customerId") customerId: string) {
    return this.customerContactService.getCustomerContacts(customerId);
  }

  @Put(":contactId")
  @ApiOperation({ summary: "更新联系人角色" })
  updateContactRole(
    @Param("customerId") customerId: string,
    @Param("contactId") contactId: string,
    @Body() updateDto: UpdateContactRoleDto,
  ) {
    return this.customerContactService.updateContactRole(
      customerId,
      contactId,
      updateDto,
    );
  }

  @Delete(":contactId")
  @ApiOperation({ summary: "取消关联（标记为离职）" })
  unlinkContact(
    @Param("customerId") customerId: string,
    @Param("contactId") contactId: string,
  ) {
    return this.customerContactService.unlinkContact(customerId, contactId);
  }
}
