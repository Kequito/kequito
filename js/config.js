// Datos de tu proyecto Supabase → Project Settings → API
// (la "anon public key" es pública por diseño; tus datos están protegidos por las reglas RLS del script SQL)
window.K = window.K || {};
K.config = {
  supabaseUrl: 'PEGA_AQUI_TU_URL',       // ej: https://abcdefgh.supabase.co
  supabaseKey: 'PEGA_AQUI_TU_ANON_KEY'   // ej: eyJhbGciOi...
};
