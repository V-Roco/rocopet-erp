import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateWorkGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
