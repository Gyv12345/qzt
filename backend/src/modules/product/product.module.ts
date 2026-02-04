import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductPackageService } from './product-package.service';
import { ProductPackageController } from './product-package.controller';
import { ProductFlowService } from './product-flow.service';
import { ProductFlowController } from './product-flow.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductController, ProductPackageController, ProductFlowController],
  providers: [ProductService, ProductPackageService, ProductFlowService],
  exports: [ProductService, ProductPackageService, ProductFlowService],
})
export class ProductModule {}
