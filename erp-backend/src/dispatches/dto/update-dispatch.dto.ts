import { DeliveryStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDispatchDto {
  @IsOptional()
  @IsEnum(DeliveryStatus)
  deliveryStatus?: DeliveryStatus;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  // Monto pagado. Obligatorio cuando paymentStatus es PARTIAL o INCOMPLETE.
  @IsOptional()
  @IsInt({ message: 'El monto pagado debe ser un número entero' })
  @Min(0, { message: 'El monto pagado no puede ser negativo' })
  paidAmount?: number;

  // Solo aplica con paymentMethod CHECK. Si no se especifica y el método es
  // cheque, se calcula automáticamente a 30 días.
  @IsOptional()
  @IsDateString()
  checkDueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
