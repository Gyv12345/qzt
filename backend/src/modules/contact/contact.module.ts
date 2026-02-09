import { Module } from "@nestjs/common";
import { ContactService } from "./contact.service";
import {
  ContactController,
  PublicContactController,
} from "./contact.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { PermissionModule } from "../permission/permission.module";

@Module({
  imports: [PrismaModule, PermissionModule],
  controllers: [ContactController, PublicContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
