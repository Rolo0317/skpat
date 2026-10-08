// Variables de prueba ANTES de cargar cualquier módulo. Sin DATABASE_URL se usa PGlite en memoria.
delete process.env.DATABASE_URL
// Las pruebas nunca suben archivos a Vercel Blob: sin token se usa almacenamiento en memoria.
delete process.env.BLOB_READ_WRITE_TOKEN
// Sin esto, `dotenv/config` (en env.ts) recargaría DATABASE_URL desde backend/.env y las pruebas
// truncarían la base real. Apuntarlo a un archivo inexistente hace que no cargue nada.
process.env.DOTENV_CONFIG_PATH = 'tests/.env.test-does-not-exist'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-change-in-production-min-32'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-change-in-production-min-32'
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '00000000000000000000000000000000000000000000000000000000000000aa'
process.env.NODE_ENV = 'test'
process.env.PORT = '3001'
