import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryUserDto } from "./dto/query-user.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { UserEntity, PaginatedUsersDto } from "./dto/user-entity.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserInfo } from "../auth/interfaces/auth.interface";

@ApiTags("users")
@Controller("users")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: "创建用户" })
  @ApiResponse({ status: 201, description: "创建成功", type: UserEntity })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 409, description: "用户名或邮箱已存在" })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: "分页查询用户列表" })
  @ApiResponse({
    status: 200,
    description: "查询成功",
    type: PaginatedUsersDto,
  })
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取用户详情" })
  @ApiResponse({ status: 200, description: "查询成功", type: UserEntity })
  @ApiResponse({ status: 404, description: "用户不存在" })
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新用户" })
  @ApiResponse({ status: 200, description: "更新成功", type: UserEntity })
  @ApiResponse({ status: 404, description: "用户不存在" })
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除用户" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  @ApiResponse({ status: 409, description: "用户有关联数据，无法删除" })
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }

  @Post(":id/reset-password")
  @ApiOperation({ summary: "重置用户密码" })
  @ApiResponse({ status: 200, description: "重置成功" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  resetPassword(
    @Param("id") id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(id, resetPasswordDto.newPassword);
  }

  @Post("me/password")
  @ApiOperation({ summary: "修改当前用户密码（需要 2FA）" })
  @ApiResponse({ status: 200, description: "修改成功" })
  @ApiResponse({ status: 401, description: "当前密码错误或 2FA 验证失败" })
  async updatePassword(
    @CurrentUser() user: UserInfo,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(user.userId, updatePasswordDto);
  }
}
