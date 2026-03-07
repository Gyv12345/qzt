import { PartialType } from "@nestjs/swagger";
import { CreateCmsContentDto } from "./create-cms-content.dto";

/**
 * 更新 CMS 内容 DTO
 * 继承自 CreateCmsContentDto，所有字段变为可选
 */
export class UpdateCmsContentDto extends PartialType(CreateCmsContentDto) {}
