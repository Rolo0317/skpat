// Inject test env vars BEFORE any module loads
process.env.DATABASE_PATH = process.env.DATABASE_PATH || ':memory:'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-change-in-production-min-32'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-change-in-production-min-32'
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '00000000000000000000000000000000000000000000000000000000000000aa'
process.env.NODE_ENV = 'test'
process.env.PORT = '3001'
