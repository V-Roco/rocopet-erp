import { SystemRole } from '@prisma/client';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEnum(SystemRole, { message: 'El rol debe ser ADMIN, PARTNER o EMPLOYEE' })
  systemRole?: SystemRole;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe asignar al menos un lugar de trabajo' })
  @IsUUID('4', { each: true })
  workGroupIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
