import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';

export class PurchaseItemDto {
  @IsUUID()
  productId: string;

  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser mayor a 0' })
  quantity: number;

  // Precio unitario CON IVA (lo que se paga al proveedor por unidad).
  @IsInt({ message: 'El costo unitario debe ser un número entero' })
  @Min(0, { message: 'El costo unitario no puede ser negativo' })
  unitCost: number;
}

export class CreatePurchaseDto {
  @IsUUID()
  supplierId: string;

  // Bodega (lugar de trabajo) a la que entra el stock. Opcional.
  @IsOptional()
  @IsUUID()
  workGroupId?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'La compra debe tener al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @IsOptional()
  @IsDateString()
  purchasedAt?: string;
}
