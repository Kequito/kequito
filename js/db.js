// Acceso a Supabase. Todas las tablas tienen: id, user_id (automático), fecha, created_at
window.K = window.K || {};

K.db = {
  client: null,

  configured: function () {
    return /^https:\/\//.test(K.config.supabaseUrl) && K.config.supabaseKey.length > 30;
  },

  init: function () {
    K.db.client = supabase.createClient(K.config.supabaseUrl, K.config.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  },

  _check: function (res) {
    if (res.error) throw new Error(res.error.message);
    return res.data;
  },

  // ───────── Sesión ─────────
  session: async function () {
    var res = await K.db.client.auth.getSession();
    return res.data.session;
  },
  login: async function (email, password) {
    var res = await K.db.client.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw new Error(res.error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : res.error.message);
  },
  logout: async function () {
    await K.db.client.auth.signOut();
  },

  // ───────── CRUD ─────────
  // Filas entre dos fechas (incluidas), más recientes primero
  list: async function (table, from, to, cols) {
    return K.db._check(await K.db.client.from(table).select(cols || '*')
      .gte('fecha', from).lte('fecha', to)
      .order('fecha', { ascending: false }).order('created_at', { ascending: false }));
  },
  // Todas las filas de una tabla (Supabase devuelve máx. 1000 por consulta → paginamos)
  all: async function (table) {
    var out = [], size = 1000;
    for (var from = 0; ; from += size) {
      var rows = K.db._check(await K.db.client.from(table).select('*')
        .order('fecha', { ascending: true }).order('created_at', { ascending: true }).range(from, from + size - 1));
      out = out.concat(rows);
      if (rows.length < size) return out;
    }
  },
  insert: async function (table, row) {
    return K.db._check(await K.db.client.from(table).insert(row).select().single());
  },
  update: async function (table, id, row) {
    return K.db._check(await K.db.client.from(table).update(row).eq('id', id).select().single());
  },
  remove: async function (table, id) {
    return K.db._check(await K.db.client.from(table).delete().eq('id', id));
  },

  // Último odómetro registrado antes (o en) una fecha, sin contar el registro editado
  lastOdometer: async function (fecha, excludeId) {
    var q = K.db.client.from('moto').select('id, odometro, fecha').not('odometro', 'is', null)
      .lte('fecha', fecha).order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(2);
    var rows = K.db._check(await q);
    rows = rows.filter(function (r) { return r.id !== excludeId; });
    return rows.length ? Number(rows[0].odometro) : null;
  },

  // Nombres de ejercicios usados antes (para autocompletar)
  exerciseNames: async function () {
    var rows = K.db._check(await K.db.client.from('gym').select('ejercicios')
      .eq('modo', 'detalle').order('fecha', { ascending: false }).limit(60));
    var seen = {};
    rows.forEach(function (r) {
      (r.ejercicios || []).forEach(function (e) { if (e.nombre) seen[e.nombre] = e.grupo || ''; });
    });
    return seen; // { nombre: grupo }
  }
};
