import { fileURLToPath } from 'node:url'
import { runSeed } from './seed/runSeed.js'

/** Las credenciales demo van a la raíz del monorepo (ignorado por git). */
const CREDENTIALS_FILE = fileURLToPath(new URL('../../../.demo-credentials.txt', import.meta.url))

async function main() {
  const summary = await runSeed({ credentialsFile: CREDENTIALS_FILE })
  console.log('Datos demo sembrados (filas nuevas):', summary)
  if (summary.users > 0) console.log(`Credenciales de los usuarios nuevos en ${CREDENTIALS_FILE}`)
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Falló el seed:', error)
    process.exit(1)
  })
