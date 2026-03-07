import { Module } from "@nestjs/common";
import { InvoiceService } from "./invoice.service";
import { InvoiceController } from "./invoice.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { PricingModule } from "../pricing/pricing.module";

@Module({
  imports: [PrismaModule, PricingModule],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
