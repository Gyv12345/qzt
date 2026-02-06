import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { CustomerService } from "./customer.service";
import { CustomerController } from "./customer.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      dest: "./uploads",
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}
