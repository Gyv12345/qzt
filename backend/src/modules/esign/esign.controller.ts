import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { EsignService } from "./esign.service";
import { InitiateSigningDto } from "./dto/initiate-signing.dto";

@ApiTags("esign")
@Controller("esign")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EsignController {
  constructor(private readonly esignService: EsignService) {}

  /**
   * 初始化合同签署
   * POST /esign/initiate
   */
  @Post("initiate")
  @ApiOperation({ summary: "初始化合同签署" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
        contractId: {
          type: "string",
          description: "合同ID",
        },
        signers: {
          type: "array",
          description: "签署人列表",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              mobile: { type: "string" },
              signerType: { type: "string", enum: ["ENTERPRISE", "PERSON"] },
              organization: { type: "string" },
              idCard: { type: "string" },
            },
          },
        },
        subject: {
          type: "string",
          description: "合同标题",
        },
        description: {
          type: "string",
          description: "合同描述",
        },
        remark: {
          type: "string",
          description: "备注",
        },
      },
    },
  })
  async initiateSigning(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType: /(pdf|application\/pdf)$/i,
          }),
        ],
        exceptionFactory: () => {
          return new BadRequestException("请上传PDF格式文件，大小不超过10MB");
        },
      }),
    )
    file: Express.Multer.File,
    @Body("contractId") contractId: string,
    @Body("signers") signersJson: string,
    @Body("subject") subject: string,
    @Body("description") description?: string,
    @Body("remark") remark?: string,
  ) {
    const initiateSigningDto: InitiateSigningDto = {
      contractId,
      signers: JSON.parse(signersJson),
      subject,
      description,
      remark,
    };

    return this.esignService.initiateSigning(
      initiateSigningDto,
      file.buffer,
      file.originalname,
    );
  }

  /**
   * 获取签署状态
   * GET /esign/status/:contractId
   */
  @Get("status/:contractId")
  @ApiOperation({ summary: "获取签署状态" })
  async getSigningStatus(@Param("contractId") contractId: string) {
    return this.esignService.getSigningStatus(contractId);
  }

  /**
   * 获取签署记录
   * GET /esign/record/:contractId
   */
  @Get("record/:contractId")
  @ApiOperation({ summary: "获取签署记录" })
  async getRecord(@Param("contractId") contractId: string) {
    return this.esignService.getRecord(contractId);
  }

  /**
   * 获取所有签署记录
   * GET /esign/records
   */
  @Get("records")
  @ApiOperation({ summary: "获取所有签署记录" })
  async findAll(
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.esignService.findAll({
      status,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
    });
  }

  /**
   * 处理 e签宝回调通知（无需认证）
   * POST /esign/callback
   */
  @Post("callback")
  @ApiOperation({ summary: "处理 e签宝回调通知" })
  async handleCallback(
    @Body() callbackData: { flowId: string; status: string; timestamp: number },
  ) {
    return this.esignService.handleCallback(callbackData);
  }
}
