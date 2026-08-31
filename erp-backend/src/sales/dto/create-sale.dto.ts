import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';

export class SaleItemDto {
  @IsUUID()
  productId: string;

  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser mayor a 0' })
  quantity: number;

  @IsInt({ message: 'El precio unitario debe ser un número entero' })
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  unitPrice: number;
}

export class CreateSaleDto {
  // Opcional: venta anónima tipo boleta (ej. venta de tienda a una persona
  // cualquiera) no necesita quedar asociada a un cliente con ficha propia.
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'La venta debe tener al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsOptional()
  @IsDateString()
  soldAt?: string;
}
