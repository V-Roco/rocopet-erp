import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateWorkGroupDto {
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  region?: string;
}
