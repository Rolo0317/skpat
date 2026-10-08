import { randomBytes } from 'node:crypto'
import { appendFile } from 'node:fs/promises'
import type { SqlClient } from '../../lib/db.js'
import { hashSecret } from '../../lib/argon2.js'
import { DEMO_STAFF, type DemoStaffUser } from './catalog.js'

/** 18 bytes aleatorios = 144 bits de entropía, 24 caracteres base64url. */
const PASSWORD_BYTES = 18
const OWNER_ONLY_FILE_MODE = 0o600

export interface SeededUser {
  id: string
  email: string
  role: DemoStaffUser['role']
}

interface Credential {
  email: string
  role: string
  password: string
}

const generatePassword = () => randomBytes(PASSWORD_BYTES).toString('base64url')

/** `on conflict do nothing`: un usuario existente conserva su contraseña. Devuelve la nueva si lo creó. */
async function createIfMissing(executor: SqlClient, user: DemoStaffUser): Promise<Credential | undefined> {
  const password = generatePassword()
  const created = await executor.one<{ id: string }>(
    `insert into users (email, password_hash, role, nombre) values ($1, $2, $3, $4)
     on conflict (email) do nothing returning id`,
    [user.email, await hashSecret(password), user.role, user.nombre],
  )
  return created ? { email: user.email, role: user.role, password } : undefined
}

/** Las contraseñas solo se escriben en este archivo (fuera de git), nunca en consola. */
async function appendCredentials(file: string, credentials: Credential[]): Promise<void> {
  if (credentials.length === 0) return
  const lines = credentials.map(({ email, role, password }) => `${role}\t${email}\t${password}`)
  const header = `# Skpat VIP demo — usuarios creados el ${new Date().toISOString()}`
  await appendFile(file, `${header}\n${lines.join('\n')}\n\n`, { mode: OWNER_ONLY_FILE_MODE })
}

export async function seedUsers(executor: SqlClient, credentialsFile: string): Promise<{ users: SeededUser[]; created: number }> {
  const credentials: Credential[] = []
  for (const user of DEMO_STAFF) {
    const credential = await createIfMissing(executor, user)
    if (credential) credentials.push(credential)
  }
  await appendCredentials(credentialsFile, credentials)
  const users = await executor.many<SeededUser>(
    'select id, email, role from users where email = any($1)',
    [DEMO_STAFF.map((user) => user.email)],
  )
  return { users, created: credentials.length }
}
