import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDispatchItemDto {
  @IsInt({ message: 'La cantidad entregada debe ser un número entero' })
  @Min(0, { message: 'La cantidad entregada no puede ser negativa' })
  deliveredQuantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
