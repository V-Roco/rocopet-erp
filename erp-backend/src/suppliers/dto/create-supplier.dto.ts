import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name: string;

  @IsString()
  @Matches(/^\d{7,8}-[\dkK]$/, { message: 'El RUT no tiene un formato válido (ej: 12345678-9)' })
  rut: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
