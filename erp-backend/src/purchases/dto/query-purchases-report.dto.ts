import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QueryPurchasesReportDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;
}
