import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { UsersService } from "./users.service";

/**
 * 公开用户查询 DTO（简化版，不包含状态筛选）
 */
class QueryPublicUserDto {
  @ApiPropertyOptional({ description: "页码", example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;
}

@ApiTags("public-users")
@Controller("public/users")
export class UsersPublicController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: "Get active users (team members) for public display",
  })
  findActiveUsers(@Query() query: QueryPublicUserDto) {
    // 仅返回启用状态的用户作为团队成员展示
    // status: "ACTIVE" 表示启用，"INACTIVE" 表示禁用
    return this.usersService.findAll({
      ...query,
      status: "ACTIVE", // 强制筛选启用状态用户
      search: undefined,
      departmentId: undefined,
      roleId: undefined,
    } as any);
  }
}
