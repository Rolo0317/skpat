// Inject test env vars BEFORE any module loads
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '00000000000000000000000000000000000000000000000000000000000000aa'
process.env.NODE_ENV = 'test'
process.env.PORT = '0'
