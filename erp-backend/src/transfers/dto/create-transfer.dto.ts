import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateTransferDto {
  @IsUUID()
  fromWorkGroupId: string;

  @IsUUID()
  toWorkGroupId: string;

  @IsUUID()
  fromProductId: string;

  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser mayor a 0' })
  quantity: number;
}
