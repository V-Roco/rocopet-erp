import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name: string;

  // No hay campo de cantidad: un producto nuevo siempre parte en 0. El
  // stock vendible sale únicamente de compras registradas (así queda
  // respaldado por lotes FIFO); si se pudiera escribir la cantidad a mano
  // acá, quedaría un número "fantasma" que la venta no reconoce como stock
  // real (no tiene lote de compra detrás).
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El stock mínimo debe ser un número entero' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo' })
  minStock?: number;
}
