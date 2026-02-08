import { Module } from "@nestjs/common";
import { EsignService } from "./esign.service";
import { EsignController } from "./esign.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [EsignController],
  providers: [EsignService],
  exports: [EsignService],
})
export class EsignModule {}
