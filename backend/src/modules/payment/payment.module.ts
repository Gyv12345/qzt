import { Module } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { PaymentController } from "./payment.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { ContractModule } from "../contract/contract.module";

@Module({
  imports: [PrismaModule, ContractModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
