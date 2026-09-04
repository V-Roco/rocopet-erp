import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name?: string;

  // La cantidad no se edita a mano: solo cambia al registrar compras
  // (suma) o ventas (resta), que son las que respaldan el stock con lotes
  // FIFO reales.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El stock mínimo debe ser un número entero' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo' })
  minStock?: number;
}
