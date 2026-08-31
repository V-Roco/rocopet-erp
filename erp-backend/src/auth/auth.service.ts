import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { validarRut, normalizarRut } from '../common/utils/rut.util';

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    // 1. Validar el RUT antes de tocar la base de datos
    if (!validarRut(dto.rut)) {
      throw new UnauthorizedException('RUT inválido');
    }

    const rutNormalizado = normalizarRut(dto.rut);

    // 2. Buscar al usuario por email Y rut (deben coincidir ambos)
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        rut: rutNormalizado,
      },
      include: { workGroups: { select: { id: true, name: true } } },
    });

    // Mensaje genérico a propósito: no revelar si fue el email, rut o pin
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Cuenta desactivada');
    }

    // 3. Verificar si la cuenta está bloqueada
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutosRestantes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Cuenta bloqueada. Intenta de nuevo en ${minutosRestantes} minuto(s)`,
      );
    }

    // 4. Verificar el PIN
    const pinValido = await bcrypt.compare(dto.pin, user.pinHash);

    if (!pinValido) {
      const intentosFallidos = user.failedLoginAttempts + 1;
      const debeBloquear = intentosFallidos >= MAX_INTENTOS;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: intentosFallidos,
          lockedUntil: debeBloquear
            ? new Date(Date.now() + MINUTOS_BLOQUEO * 60000)
            : null,
        },
      });

      if (debeBloquear) {
        throw new UnauthorizedException(
          `Demasiados intentos fallidos. Cuenta bloqueada por ${MINUTOS_BLOQUEO} minutos`,
        );
      }

      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 5. Login exitoso: resetear contador y actualizar last_login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // 6. Generar el token JWT
    const workGroupIds = user.workGroups.map((wg) => wg.id);
    const payload = {
      sub: user.id,
      email: user.email,
      systemRole: user.systemRole,
      workGroupIds,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        systemRole: user.systemRole,
        workGroups: user.workGroups,
      },
    };
  }
}