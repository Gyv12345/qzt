import { IsString, IsNotEmpty, IsArray, IsOptional, IsNumber } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString()
  @IsOptional()
  permissionIds?: string[];
}
