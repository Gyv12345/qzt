import { Module } from "@nestjs/common";
import { ContactService } from "./contact.service";
import {
  ContactController,
  PublicContactController,
} from "./contact.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { RolesModule } from "../roles/roles.module";

@Module({
  imports: [PrismaModule, RolesModule],
  controllers: [ContactController, PublicContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
