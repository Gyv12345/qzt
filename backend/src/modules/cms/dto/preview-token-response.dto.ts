import { ApiProperty } from "@nestjs/swagger";

/**
 * 预览令牌响应 DTO
 */
export class PreviewTokenResponseDto {
  @ApiProperty({
    description: "预览令牌",
    example: "abc123def456",
  })
  token: string;

  @ApiProperty({
    description: "预览 URL",
    example: "/preview/contents/abc123def456",
  })
  previewUrl: string;

  @ApiProperty({
    description: "过期时间",
    example: "2024-01-01T12:30:00.000Z",
  })
  expiresAt: string;

  @ApiProperty({
    description: "过期时间戳（毫秒）",
    example: 1704105000000,
  })
  expiresAtTimestamp: number;
}

/**
 * 页面预览令牌响应 DTO
 */
export class PagePreviewTokenResponseDto {
  @ApiProperty({
    description: "预览令牌",
    example: "xyz789abc123",
  })
  token: string;

  @ApiProperty({
    description: "预览 URL",
    example: "/preview/pages/xyz789abc123",
  })
  previewUrl: string;

  @ApiProperty({
    description: "过期时间",
    example: "2024-01-01T12:30:00.000Z",
  })
  expiresAt: string;

  @ApiProperty({
    description: "过期时间戳（毫秒）",
    example: 1704105000000,
  })
  expiresAtTimestamp: number;
}
