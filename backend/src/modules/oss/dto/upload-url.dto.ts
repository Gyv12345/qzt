import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UploadUrlDto {
  @ApiProperty({ description: '文件名', example: 'document.pdf' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'MIME 类型', example: 'application/pdf', required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;
}
