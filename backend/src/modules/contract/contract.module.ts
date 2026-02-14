import { Module } from "@nestjs/common";
import { ContractService } from "./contract.service";
import { ContractController } from "./contract.controller";
import { ContractPublicController } from "./contract-public.controller";
import { ContractTemplateService } from "./contract-template.service";
import { ContractTemplateController } from "./contract-template.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [
    ContractController,
    ContractPublicController,
    ContractTemplateController,
  ],
  providers: [ContractService, ContractTemplateService],
  exports: [ContractService, ContractTemplateService],
})
export class ContractModule {}
