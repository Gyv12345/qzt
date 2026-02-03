import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({ description: '文件名', example: 'document.pdf' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: '文件内容 (Base64)', example: 'base64...' })
  @IsString()
  fileContent: string;

  @ApiProperty({
    description: '文件类型',
    enum: ['image', 'document', 'video', 'other'],
    example: 'document',
    required: false
  })
  @IsOptional()
  @IsEnum(['image', 'document', 'video', 'other'])
  fileType?: string;

  @ApiProperty({ description: 'MIME 类型', example: 'application/pdf', required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;
}
