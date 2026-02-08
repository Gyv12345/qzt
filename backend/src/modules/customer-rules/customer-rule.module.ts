import { Module } from "@nestjs/common";
import { CustomerRuleController } from "./customer-rule.controller";
import { CustomerRuleService } from "./customer-rule.service";
import { PrismaModule } from "../../common/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [CustomerRuleController],
  providers: [CustomerRuleService],
  exports: [CustomerRuleService],
})
export class CustomerRuleModule {}
