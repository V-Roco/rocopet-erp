import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  email: string;

  @IsString()
  @Matches(/^\d{7,8}-[\dkK]$/, { message: 'El RUT no tiene un formato válido (ej: 12345678-9)' })
  rut: string;

  @IsString()
  @Length(4, 4, { message: 'El PIN debe tener exactamente 4 dígitos' })
  @Matches(/^\d{4}$/, { message: 'El PIN solo puede contener números' })
  pin: string;
}