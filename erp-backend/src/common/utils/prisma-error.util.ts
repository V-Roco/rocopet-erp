// Postgres SQLSTATE codes para violaciones de llave foránea:
// 23503 = foreign_key_violation, 23001 = restrict_violation.
// Con Prisma 7 + adapter-pg estos errores de borrado/actualización llegan como
// un DriverAdapterError crudo (no como Prisma.PrismaClientKnownRequestError),
// así que se detectan inspeccionando la causa en vez del código P-xxxx de Prisma.
const FOREIGN_KEY_SQLSTATE_CODES = new Set(['23503', '23001']);

export function isForeignKeyViolation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const cause = (error as { cause?: { code?: string } }).cause;
  if (cause?.code && FOREIGN_KEY_SQLSTATE_CODES.has(cause.code)) {
    return true;
  }

  return /foreign key|violates .*constraint/i.test(error.message);
}
