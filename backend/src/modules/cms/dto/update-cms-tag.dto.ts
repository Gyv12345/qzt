import { PartialType } from "@nestjs/swagger";
import { CreateCmsTagDto } from "./create-cms-tag.dto";

/**
 * 更新 CMS 标签 DTO
 */
export class UpdateCmsTagDto extends PartialType(CreateCmsTagDto) {}
