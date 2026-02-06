import { Module } from "@nestjs/common";
import { LoginLogsController } from "./login-logs.controller";
import { LoginLogsService } from "./login-logs.service";
import { PrismaModule } from "../../common/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [LoginLogsController],
  providers: [LoginLogsService],
  exports: [LoginLogsService],
})
export class LoginLogsModule {}
