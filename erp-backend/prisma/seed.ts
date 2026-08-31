import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient, SystemRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { normalizarRut } from '../src/common/utils/rut.util';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const workGroup = await prisma.workGroup.upsert({
    where: { name: 'Casa Matriz' },
    update: {},
    create: { name: 'Casa Matriz', description: 'Bodega/lugar de trabajo por defecto' },
  });

  const email = 'admin@rocopet.cl';
  const rut = normalizarRut('12345678-5');
  const pin = '1234';
  const pinHash = await bcrypt.hash(pin, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      rut,
      pinHash,
      fullName: 'Admin Rocopet',
      systemRole: SystemRole.ADMIN,
      workGroups: { connect: { id: workGroup.id } },
    },
  });

  console.log('Usuario creado:', { email: user.email, rut: '12345678-5', pin, role: SystemRole.ADMIN });
  await prisma.$disconnect();
}

main();
