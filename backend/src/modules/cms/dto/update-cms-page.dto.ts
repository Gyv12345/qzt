import { PartialType } from "@nestjs/swagger";
import { CreateCmsPageDto } from "./create-cms-page.dto";

/**
 * 更新 CMS 页面 DTO
 * 继承自 CreateCmsPageDto，所有字段变为可选
 */
export class UpdateCmsPageDto extends PartialType(CreateCmsPageDto) {}
