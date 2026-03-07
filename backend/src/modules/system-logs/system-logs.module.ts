import { Module } from "@nestjs/common";
import { SystemLogsController } from "./system-logs.controller";
import { SystemLogsService } from "./system-logs.service";

@Module({
  controllers: [SystemLogsController],
  providers: [SystemLogsService],
  exports: [SystemLogsService],
})
export class SystemLogsModule {}
