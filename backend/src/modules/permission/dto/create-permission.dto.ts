import { IsString, IsNotEmpty, IsEnum, IsOptional } from "class-validator";

export enum PermissionType {
  MENU = "menu",
  BUTTON = "button",
  DATA = "data",
}

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(PermissionType)
  type: PermissionType;

  @IsString()
  @IsOptional()
  description?: string;
}
