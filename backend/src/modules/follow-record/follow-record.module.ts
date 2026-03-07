import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { FollowRecordController } from "./follow-record.controller";
import { FollowRecordService } from "./follow-record.service";

@Module({
  controllers: [FollowRecordController],
  providers: [FollowRecordService, PrismaService],
  exports: [FollowRecordService],
})
export class FollowRecordModule {}
