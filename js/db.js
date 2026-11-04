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
  all: async function (table, orderCol) {
    var out = [], size = 1000;
    for (var from = 0; ; from += size) {
      var rows = K.db._check(await K.db.client.from(table).select('*')
        .order(orderCol || 'fecha', { ascending: true }).order('created_at', { ascending: true }).range(from, from + size - 1));
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

  // ───────── Moto ─────────
  motos: async function () {
    return K.db._check(await K.db.client.from('motos').select('*').order('created_at', { ascending: true }));
  },
  // Lecturas de odómetro de una moto entre dos fechas (ascendente) + la última anterior a "from"
  kmRange: async function (motoId, from, to) {
    var c = K.db.client, res = await Promise.all([
      c.from('moto_km').select('*').eq('moto_id', motoId).gte('fecha', from).lte('fecha', to).order('fecha', { ascending: true }),
      c.from('moto_km').select('*').eq('moto_id', motoId).lt('fecha', from).order('fecha', { ascending: false }).limit(1)
    ]);
    return { rows: K.db._check(res[0]), prev: K.db._check(res[1])[0] || null };
  },
  // Lecturas vecinas de una fecha: la anterior, la del mismo día y la siguiente
  kmNeighbors: async function (motoId, fecha) {
    var c = K.db.client, res = await Promise.all([
      c.from('moto_km').select('*').eq('moto_id', motoId).lt('fecha', fecha).order('fecha', { ascending: false }).limit(1),
      c.from('moto_km').select('*').eq('moto_id', motoId).eq('fecha', fecha).limit(1),
      c.from('moto_km').select('*').eq('moto_id', motoId).gt('fecha', fecha).order('fecha', { ascending: true }).limit(1)
    ]);
    return { prev: K.db._check(res[0])[0] || null, same: K.db._check(res[1])[0] || null, next: K.db._check(res[2])[0] || null };
  },
  // Recargas de una moto entre dos fechas (ascendente) + la última anterior (para comparar precio)
  cargasRange: async function (motoId, from, to) {
    var c = K.db.client, res = await Promise.all([
      c.from('moto_cargas').select('*').eq('moto_id', motoId).gte('fecha', from).lte('fecha', to)
        .order('fecha', { ascending: true }).order('created_at', { ascending: true }),
      c.from('moto_cargas').select('*').eq('moto_id', motoId).lt('fecha', from)
        .order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(1)
    ]);
    return { rows: K.db._check(res[0]), prev: K.db._check(res[1])[0] || null };
  },
  // Todas las lecturas (de todas las motos) entre dos fechas, ascendente
  kmAll: async function (from, to) {
    return K.db._check(await K.db.client.from('moto_km').select('*').gte('fecha', from).lte('fecha', to)
      .order('fecha', { ascending: true }));
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
