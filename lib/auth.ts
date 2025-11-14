import bcrypt from "bcryptjs"

/**
 * Crea un hash seguro de una contraseña usando bcrypt
 * @param password La contraseña en texto plano
 * @returns Una promesa que resuelve al hash de la contraseña
 */
export async function hashPassword(password: string): Promise<string> {
  // El factor de costo (12) determina la complejidad del hash
  // Un valor más alto es más seguro pero más lento
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

/**
 * Verifica si una contraseña coincide con un hash
 * @param password La contraseña en texto plano a verificar
 * @param hashedPassword El hash almacenado de la contraseña
 * @returns Una promesa que resuelve a true si la contraseña coincide, false en caso contrario
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

