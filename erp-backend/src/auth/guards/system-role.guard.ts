import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole } from '@prisma/client';

export const RequireRole = (...roles: SystemRole[]) => SetMetadata('roles', roles);

@Injectable()
export class SystemRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // getAllAndOverride: si el método tiene @RequireRole propio, gana ese;
    // si no, cae al @RequireRole puesto a nivel de controller.
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user; // viene del JWT decodificado

    return !!user && requiredRoles.includes(user.systemRole);
  }
}
