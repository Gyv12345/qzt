import { ApiProperty } from '@nestjs/swagger';

export class LoginRoleDto {
  @ApiProperty({ description: '角色 ID' })
  id: string;

  @ApiProperty({ description: '角色名称' })
  name: string;

  @ApiProperty({ description: '角色代码' })
  code: string;
}

export class LoginUserDto {
  @ApiProperty({ description: '用户 ID' })
  id: string;

  @ApiProperty({ description: '用户名' })
  username: string;

  @ApiProperty({ description: '姓名' })
  name: string;

  @ApiProperty({ description: '邮箱', required: false })
  email?: string;

  @ApiProperty({ description: '手机号', required: false })
  phone?: string;

  @ApiProperty({ description: '头像', required: false })
  avatar?: string;

  @ApiProperty({ description: '用户角色', type: [LoginRoleDto] })
  roles: LoginRoleDto[];
}

export class LoginResponseDto {
  @ApiProperty({ description: '访问令牌' })
  access_token: string;

  @ApiProperty({ description: '用户信息', type: LoginUserDto })
  user: LoginUserDto;
}
