import { Module } from "@nestjs/common";
import { ProductService } from "./product.service";
import { ProductController } from "./product.controller";
import { ProductPublicController } from "./product-public.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ProductController, ProductPublicController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
