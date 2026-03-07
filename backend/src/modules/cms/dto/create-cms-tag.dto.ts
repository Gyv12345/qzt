import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * 创建 CMS 标签 DTO
 */
export class CreateCmsTagDto {
  @ApiProperty({ description: "标签名称", example: "科技" })
  @IsString()
  @MinLength(1, { message: "标签名称不能为空" })
  @MaxLength(50, { message: "标签名称最多50个字符" })
  name: string;

  @ApiProperty({ description: "URL别名", example: "tech" })
  @IsString()
  @MinLength(1, { message: "URL别名不能为空" })
  @MaxLength(100, { message: "URL别名最多100个字符" })
  slug: string;

  @ApiPropertyOptional({ description: "标签颜色", example: "#3B82F6" })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: "排序", default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
