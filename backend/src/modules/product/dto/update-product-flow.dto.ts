import { PartialType } from '@nestjs/swagger';
import { CreateProductFlowDto } from './create-product-flow.dto';

export class UpdateProductFlowDto extends PartialType(CreateProductFlowDto) {}
