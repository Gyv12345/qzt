import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

export class CalculatePriceDto {
  @IsString()
  @IsNotEmpty()
  contractId: string;

  @IsNumber()
  @IsNotEmpty()
  invoiceAmount: number;

  @IsNumber()
  @IsOptional()
  invoiceCount?: number;
}
