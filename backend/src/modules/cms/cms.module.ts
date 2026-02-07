import { Module } from "@nestjs/common";
import { CmsService } from "./cms.service";
import { CmsController } from "./cms.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [CmsController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
