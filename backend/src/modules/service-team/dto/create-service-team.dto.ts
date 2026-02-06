import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class CreateServiceTeamDto {
  @ApiProperty({ description: "客户ID", example: "cuid123" })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ description: "用户ID", example: "cuid456" })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: "角色代码",
    example: "SALE",
    enum: ["SALE", "FINANCE", "OUTWORK"],
  })
  @IsString()
  @IsNotEmpty()
  roleCode: "SALE" | "FINANCE" | "OUTWORK";
}
