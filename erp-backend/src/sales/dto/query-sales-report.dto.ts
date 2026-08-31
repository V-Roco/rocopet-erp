import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QuerySalesReportDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;
}
