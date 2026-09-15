import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';

// El frontend manda el lugar de trabajo activo (el que el usuario tiene
// elegido en el selector) en este header en cada request. Se valida contra
// los lugares de trabajo a los que el usuario realmente pertenece (viene en
// el JWT) para que nadie pueda leer/escribir datos de una bodega ajena con
// solo cambiar el header a mano.
export function getActiveWorkGroupId(req: Request): string {
  const workGroupId = req.headers['x-work-group-id'];
  const user = req.user as { workGroupIds: string[] } | undefined;

  if (typeof workGroupId !== 'string' || !workGroupId) {
    throw new ForbiddenException('Falta seleccionar un lugar de trabajo');
  }
  if (!user?.workGroupIds.includes(workGroupId)) {
    throw new ForbiddenException('No perteneces a ese lugar de trabajo');
  }
  return workGroupId;
}
