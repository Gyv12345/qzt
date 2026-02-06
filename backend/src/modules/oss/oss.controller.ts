import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OssService } from "./oss.service";
import { UploadFileDto } from "./dto/upload-file.dto";
import { UploadUrlDto } from "./dto/upload-url.dto";

@ApiTags("oss")
@Controller("oss")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OssController {
  constructor(private readonly ossService: OssService) {}

  @Post("upload")
  @ApiOperation({ summary: "上传文件" })
  @ApiResponse({ status: 201, description: "上传成功" })
  @ApiResponse({ status: 400, description: "上传失败" })
  uploadFile(@Body() uploadFileDto: UploadFileDto, @Request() req) {
    return this.ossService.uploadFile(uploadFileDto, req.user?.id);
  }

  @Post("upload-url")
  @ApiOperation({ summary: "获取上传授权 URL（前端直传）" })
  @ApiResponse({ status: 200, description: "生成成功" })
  getUploadUrl(@Body() uploadUrlDto: UploadUrlDto) {
    return this.ossService.getUploadUrl(
      uploadUrlDto.fileName,
      uploadUrlDto.mimeType,
    );
  }

  @Get("files")
  @ApiOperation({ summary: "分页查询文件列表" })
  @ApiResponse({ status: 200, description: "查询成功" })
  findFiles(
    @Query("page") page: string = "1",
    @Query("pageSize") pageSize: string = "10",
    @Query("fileType") fileType?: string,
  ) {
    return this.ossService.findFiles(
      parseInt(page) || 1,
      parseInt(pageSize) || 10,
      fileType,
    );
  }

  @Get("usage")
  @ApiOperation({ summary: "获取存储空间使用统计" })
  @ApiResponse({ status: 200, description: "查询成功" })
  getUsage() {
    return this.ossService.getUsage();
  }

  @Get("files/:id")
  @ApiOperation({ summary: "获取文件详情" })
  @ApiResponse({ status: 200, description: "查询成功" })
  @ApiResponse({ status: 404, description: "文件不存在" })
  findOne(@Param("id") id: string) {
    return this.ossService.findOne(id);
  }

  @Delete("files/:id")
  @ApiOperation({ summary: "删除文件" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 404, description: "文件不存在" })
  remove(@Param("id") id: string) {
    return this.ossService.remove(id);
  }
}
