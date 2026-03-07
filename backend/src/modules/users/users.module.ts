import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { UsersPublicController } from "./users-public.controller";
import { TwoFactorModule } from "../two-factor/two-factor.module";

@Module({
  imports: [TwoFactorModule],
  controllers: [UsersController, UsersPublicController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
