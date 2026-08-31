import { SystemRole } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  email: string;

  @IsString()
  @Matches(/^\d{7,8}-[\dkK]$/, { message: 'El RUT no tiene un formato válido (ej: 12345678-9)' })
  rut: string;

  @IsString()
  @Length(4, 4, { message: 'El PIN debe tener exactamente 4 dígitos' })
  @Matches(/^\d{4}$/, { message: 'El PIN solo puede contener números' })
  pin: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsEnum(SystemRole, { message: 'El rol debe ser ADMIN, PARTNER o EMPLOYEE' })
  systemRole: SystemRole;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe asignar al menos un lugar de trabajo' })
  @IsUUID('4', { each: true })
  workGroupIds: string[];
}
