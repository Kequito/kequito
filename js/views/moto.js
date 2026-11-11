// 🏍️ Moto: mis motos, kilometraje diario por odómetro y recargas de combustible
window.K = window.K || {};
K.views = K.views || {};

K.views.moto = {
  title: 'Moto',
  MARCAS: {
    'Honda': ['CB190R', 'CB125F', 'XR150L', 'XR190L', 'Wave 110S', 'Navi', 'CBR250R', 'XRE300'],
    'Yamaha': ['FZ25', 'FZ-S', 'FZ15', 'XTZ125', 'XTZ150', 'YBR125', 'MT-03', 'R15', 'Crypton'],
    'Bajaj': ['Pulsar NS200', 'Pulsar NS160', 'Pulsar N250', 'Pulsar 180', 'Boxer CT100', 'Boxer BM150', 'Dominar 400', 'Discover 125'],
    'Suzuki': ['Gixxer 150', 'Gixxer 250', 'GN125', 'DR150', 'AX4'],
    'TVS': ['Apache RTR 160', 'Apache RTR 200', 'Raider 125', 'Ntorq 125'],
    'Kawasaki': ['Ninja 400', 'Z400', 'KLX150'],
    'KTM': ['Duke 200', 'Duke 250', 'Duke 390', 'RC 200'],
    'Royal Enfield': ['Classic 350', 'Meteor 350', 'Himalayan'],
    'Ronco': [], 'Wanxin': [], 'Lifan': [], 'Italika': [], 'Otra': []
  },

  // ───────── Moto activa (recordada en este dispositivo) ─────────
  active: function (motos) {
    var id = null;
    try { id = localStorage.getItem('kq_moto'); } catch (e) {}
    return motos.filter(function (m) { return m.id === id; })[0] || motos[0] || null;
  },
  setActive: function (id) {
    try { localStorage.setItem('kq_moto', id); } catch (e) {}
  },
  label: function (m) {
    return [m.marca, m.modelo, m.anio].filter(Boolean).join(' ');
  },

  // Lecturas ascendentes → [{row, km, span}] (km = diferencia con la lectura anterior; null si es la primera)
  days: function (rows, prev) {
    var last = prev, out = [];
    rows.forEach(function (r) {
      out.push({
        row: r,
        km: last ? Math.round((Number(r.odometro) - Number(last.odometro)) * 10) / 10 : null,
        span: last ? K.d.diff(r.fecha, last.fecha) : 0
      });
      last = r;
    });
    return out;
  },

  render: async function (root) {
    var V = K.views.moto;
    var motos = await K.db.motos();
    if (!motos.length) {
      root.innerHTML =
        '<section class="card accent-moto center">' +
          '<div class="big">🏍️</div>' +
          '<h2>Registra tu moto</h2>' +
          '<p class="muted">Ponle un apodo, elige el modelo y anota su odómetro actual. Desde ahí calculo cuánto recorres cada día.</p>' +
          '<button class="btn primary block" data-newmoto>Agregar mi moto</button>' +
        '</section>';
      root.querySelector('[data-newmoto]').onclick = function () { V.motoForm(null); };
      return;
    }

    var moto = V.active(motos), ym = K.state.month, r = K.d.monthRange(ym), t = K.d.today();
    // Recargas hasta hoy (aunque se mire un mes pasado) para conocer el precio vigente
    var res = await Promise.all([
      K.db.kmRange(moto.id, r[0], r[1]),
      K.db.cargasRange(moto.id, r[0], r[1] > t ? r[1] : t),
      K.db.kmNeighbors(moto.id, t)
    ]);
    var km = res[0], hoy = res[2];
    var precios = (res[1].prev ? [res[1].prev] : []).concat(res[1].rows);
    var cg = { rows: res[1].rows.filter(function (c) { return c.fecha <= r[1]; }), prev: res[1].prev };
    var rend = Number(moto.rendimiento) || 0;
    // Costo por km de una fecha (precio de la última recarga hasta ese día ÷ rendimiento)
    var costoEn = function (fecha) { return V.costoKm(precios, fecha, rend); };
    var entries = V.days(km.rows, km.prev);

    // Kilometraje del mes
    var kmMes = 0, dias = 0;
    entries.forEach(function (e) { if (e.km != null) { kmMes += e.km; dias += e.span; } });
    var lastRead = km.rows.length ? km.rows[km.rows.length - 1] : km.prev;

    // Combustible del mes
    var gal = 0, gasto = 0;
    cg.rows.forEach(function (c) { gal += Number(c.galones); gasto += Number(c.total); });
    var ultima = cg.rows[cg.rows.length - 1] || null;
    var antes = cg.rows.length > 1 ? cg.rows[cg.rows.length - 2] : cg.prev;

    // Estado de hoy
    var hoyKm = hoy.same && hoy.prev ? Number(hoy.same.odometro) - Number(hoy.prev.odometro) : null;
    var tab = K.state.motoTab || 'km';

    // Gasto diario aprox. = km por día del mes × costo por km (con el precio vigente al final del mes)
    var costo = costoEn(r[1] < t ? r[1] : t);
    var diario = costo && dias ? (kmMes / dias) * costo.porKm : null;
    var hoyCosto = hoyKm != null ? costoEn(t) : null;

    root.innerHTML =
      '<button class="moto-head" data-motos>' +
        '<span class="moto-ico">🏍️</span>' +
        '<span class="item-main"><b>' + K.esc(moto.apodo) + '</b><small>' + K.esc(V.label(moto) || 'Toca para editar') + '</small></span>' +
        '<span class="muted">' + (motos.length > 1 ? 'Cambiar ›' : 'Editar ›') + '</span>' +
      '</button>' +

      '<section class="card accent-moto today-km">' +
        '<div class="muted small">Kilometraje de hoy</div>' +
        (hoy.same
          ? '<div class="big">' + (hoyKm != null ? '+' + K.n1(hoyKm) + ' <small>km</small>' : K.n1(hoy.same.odometro) + ' <small>km</small>') + '</div>' +
            '<div class="muted small">Odómetro: ' + K.n1(hoy.same.odometro) + ' km' +
              (hoy.prev && K.d.diff(t, hoy.prev.fecha) > 1 ? ' · desde ' + K.esc(K.d.dayLabel(hoy.prev.fecha)) : '') +
              (hoyKm == null ? ' · punto de partida' : '') +
              (hoyCosto ? ' · ≈ <b class="txt">' + K.money(hoyKm * hoyCosto.porKm) + '</b> en combustible' : '') + '</div>'
          : '<div class="muted">Aún no registras el odómetro de hoy' +
              (hoy.prev ? ' · último: ' + K.n1(hoy.prev.odometro) + ' km (' + K.esc(K.d.dayLabel(hoy.prev.fecha)) + ')' : '') + '</div>') +
        '<div class="actions">' +
          '<button class="btn primary" data-km>📍 ' + (hoy.same ? 'Actualizar odómetro' : 'Registrar odómetro') + '</button>' +
          '<button class="btn" data-carga>⛽ Recarga</button>' +
        '</div>' +
      '</section>' +

      K.monthNav(ym) +
      '<section class="card accent-moto">' +
        '<div class="big">' + K.n1(kmMes) + ' <small>km en el mes</small></div>' +
        '<div class="muted">' + (dias ? '≈ ' + K.n1(kmMes / dias) + ' km por día (' + dias + ' día' + (dias === 1 ? '' : 's') + ' medidos)' : 'Registra el odómetro dos días para ver tu promedio') + '</div>' +
        '<div class="daily">' +
          (diario != null
            ? '<div><span class="muted small">Gasto diario en combustible</span><b>≈ ' + K.money(diario) + ' <small>/día</small></b></div>' +
              '<div class="right"><span class="muted small">por km</span><b>' + K.money(costo.porKm) + '</b></div>' +
              '<p class="muted small">≈ ' + K.money(diario * 30) + ' al mes · ' + K.money(costo.precio) + '/gal ÷ ' + K.n1(rend) + ' km/gal</p>'
            : '<p class="muted small">💸 ' + (!rend
                ? 'Agrega el <b class="txt">rendimiento</b> de tu moto (km por galón de la ficha técnica) para calcular tu gasto diario. <button type="button" class="link-btn" data-rend>Agregar</button>'
                : !precios.length ? 'Registra una recarga para conocer el precio del galón y calcular tu gasto diario.'
                : 'Registra el odómetro dos días para calcular tu gasto diario.') + '</p>') +
        '</div>' +
        '<div class="stats">' +
          '<div><b>' + K.money(gasto) + '</b><small>combustible</small></div>' +
          '<div><b>' + (gal ? K.n1(gal) : '—') + '</b><small>galones</small></div>' +
          '<div><b>' + (rend ? K.n1(rend) : '—') + '</b><small>km/gal (ficha)</small></div>' +
        '</div>' +
        (ultima ? '<div class="muted small">Último precio: <b class="txt">' + K.money(ultima.precio_galon) + '/gal</b>' + V.trend(ultima, antes) +
          (gal ? ' · prom. del mes ' + K.money(gasto / gal) + '/gal' : '') + '</div>' : '') +
        (lastRead ? '<div class="muted small">Odómetro actual: ' + K.n1(lastRead.odometro) + ' km</div>' : '') +
      '</section>' +

      '<div class="seg" data-tabs>' +
        '<label><input type="radio" name="mtab" value="km"' + (tab === 'km' ? ' checked' : '') + '><span>Recorridos</span></label>' +
        '<label><input type="radio" name="mtab" value="cargas"' + (tab === 'cargas' ? ' checked' : '') + '><span>Recargas</span></label>' +
      '</div>' +
      (tab === 'km' ? V.kmList(entries, costoEn) : V.cargasList(cg.rows, cg.prev));

    K.bindNav(root);
    root.querySelector('[data-motos]').onclick = function () { V.motosSheet(motos, moto); };
    var br = root.querySelector('[data-rend]');
    if (br) br.onclick = function () { V.motoForm(moto); };
    root.querySelector('[data-km]').onclick = function () { V.kmForm(moto, null, t); };
    root.querySelector('[data-carga]').onclick = function () { V.cargaForm(moto, null); };
    root.querySelectorAll('input[name="mtab"]').forEach(function (i) {
      i.onchange = function () { K.state.motoTab = i.value; K.app.render(); };
    });
    root.querySelectorAll('[data-kid]').forEach(function (b) {
      b.onclick = function () { V.kmForm(moto, km.rows.filter(function (x) { return x.id === b.dataset.kid; })[0]); };
    });
    root.querySelectorAll('[data-cid]').forEach(function (b) {
      b.onclick = function () { V.cargaForm(moto, cg.rows.filter(function (x) { return x.id === b.dataset.cid; })[0]); };
    });
  },

  // ▲▼ del precio por galón respecto a la recarga anterior
  trend: function (c, prev) {
    if (!prev) return '';
    var d = Number(c.precio_galon) - Number(prev.precio_galon);
    if (Math.abs(d) < 0.005) return ' <span class="muted">= igual</span>';
    return d > 0 ? ' <span class="up">▲ ' + K.money(d) + '</span>' : ' <span class="down">▼ ' + K.money(-d) + '</span>';
  },

  // Costo por km en una fecha = precio por galón de la última recarga hasta ese día ÷ rendimiento (km/gal de la ficha).
  // "precios" son las recargas en orden ascendente; si la fecha es anterior a todas, usa la primera.
  costoKm: function (precios, fecha, rend) {
    if (!rend || !precios.length) return null;
    var c = precios[0];
    precios.forEach(function (x) { if (x.fecha <= fecha) c = x; });
    var precio = Number(c.precio_galon);
    return { precio: precio, porKm: precio / rend };
  },

  kmList: function (entries, costoEn) {
    if (!entries.length) return K.empty('Sin registros de odómetro este mes');
    return '<div class="list">' + entries.slice().reverse().map(function (e) {
      var val = e.km == null ? 'Inicio' : '+' + K.n1(e.km) + ' km';
      var costo = e.km != null ? costoEn(e.row.fecha) : null;
      return '<button class="item" data-kid="' + e.row.id + '">' +
        '<span class="item-ico">📍</span>' +
        '<span class="item-main"><b class="cap">' + K.esc(K.d.dayLabel(e.row.fecha)) + '</b>' +
          '<small>Odómetro ' + K.n1(e.row.odometro) + ' km' + (e.span > 1 ? ' · ' + e.span + ' días desde el anterior' : '') + '</small></span>' +
        '<span class="item-val right">' + val +
          (costo ? '<small>≈ ' + K.money(e.km * costo.porKm) + '</small>' : '') + '</span></button>';
    }).join('') + '</div>';
  },

  cargasList: function (rows, prev) {
    if (!rows.length) return K.empty('Sin recargas este mes');
    var V = K.views.moto;
    return '<div class="list">' + rows.map(function (c, i) {
      return { c: c, prev: i ? rows[i - 1] : prev };
    }).reverse().map(function (x) {
      var c = x.c;
      return '<button class="item" data-cid="' + c.id + '">' +
        '<span class="item-ico">⛽</span>' +
        '<span class="item-main"><b class="cap">' + K.esc(K.d.dayLabel(c.fecha)) + ' · ' + K.money(c.total) + '</b>' +
          '<small>' + K.n1(c.galones) + ' gal' + (c.nota ? ' · ' + K.esc(c.nota) : '') + '</small></span>' +
        '<span class="item-val right">' + K.money(c.precio_galon) + '<small>/gal' + V.trend(c, x.prev) + '</small></span></button>';
    }).join('') + '</div>';
  },

  // ───────── Mis motos ─────────
  motosSheet: function (motos, current) {
    var V = K.views.moto;
    K.sheet.open({
      title: 'Mis motos',
      submitLabel: 'Listo',
      html:
        '<div class="list">' + motos.map(function (m) {
          return '<button type="button" class="item" data-pick="' + m.id + '">' +
            '<span class="item-ico">' + (m.id === current.id ? '✅' : '🏍️') + '</span>' +
            '<span class="item-main"><b>' + K.esc(m.apodo) + '</b><small>' + K.esc(V.label(m)) + '</small></span></button>';
        }).join('') + '</div>' +
        '<button type="button" class="btn block" data-edit>✏️ Editar "' + K.esc(current.apodo) + '"</button>' +
        '<button type="button" class="btn ghost block" data-add>＋ Agregar otra moto</button>',
      mount: function (f) {
        f.querySelectorAll('[data-pick]').forEach(function (b) {
          b.onclick = function () { V.setActive(b.dataset.pick); K.sheet.close(); K.app.render(); };
        });
        f.querySelector('[data-edit]').onclick = function () { V.motoForm(current); };
        f.querySelector('[data-add]').onclick = function () { V.motoForm(null); };
      },
      submit: function () { K.sheet.close(); return false; }
    });
  },

  motoForm: function (moto) {
    var V = K.views.moto, isNew = !moto;
    moto = moto || {};
    var marcas = Object.keys(V.MARCAS);
    K.sheet.open({
      title: isNew ? 'Nueva moto' : 'Editar moto',
      html:
        K.field('Apodo', '<input name="apodo" placeholder="ej. La Negra, Relámpago…" value="' + K.esc(moto.apodo || '') + '">') +
        K.field('Marca', '<select name="marca"><option value="">Elige…</option>' + marcas.map(function (m) {
          return '<option' + (m === moto.marca ? ' selected' : '') + '>' + m + '</option>';
        }).join('') + '</select>') +
        K.field('Modelo', '<input name="modelo" list="modeloList" placeholder="ej. CB190R" value="' + K.esc(moto.modelo || '') + '"><datalist id="modeloList"></datalist>') +
        K.field('Año (opcional)', '<input name="anio" inputmode="numeric" placeholder="ej. 2022" value="' + (moto.anio || '') + '">') +
        K.field('Rendimiento (km por galón)', '<input name="rendimiento" inputmode="decimal" placeholder="ej. 120" value="' + (moto.rendimiento || '') + '">',
          'Búscalo en la ficha técnica ("rendimiento aprox. por galón"). Con esto calculo tu gasto diario en combustible.') +
        (isNew ? K.field('Odómetro actual (km)', '<input name="odometro" inputmode="decimal" placeholder="lo que marca el tablero">',
          'Será el punto de partida para calcular tus recorridos.') : ''),
      mount: function (f) {
        function fill() {
          f.querySelector('#modeloList').innerHTML = (V.MARCAS[f.marca.value] || []).map(function (m) {
            return '<option value="' + K.esc(m) + '">';
          }).join('');
        }
        f.marca.onchange = fill; fill();
        if (isNew) setTimeout(function () { f.apodo.focus(); }, 300);
      },
      submit: async function (f) {
        var apodo = f.apodo.value.trim();
        if (!apodo) throw new Error('Ponle un apodo a tu moto :3');
        var anio = K.num(f.anio.value);
        var rend = K.num(f.rendimiento.value);
        if (rend != null && rend <= 0) throw new Error('El rendimiento debe ser mayor que 0');
        var data = { apodo: apodo, marca: f.marca.value || null, modelo: f.modelo.value.trim() || null, anio: anio ? Math.round(anio) : null, rendimiento: rend };
        if (!isNew) {
          await K.db.update('motos', moto.id, data);
          K.toast('Moto actualizada');
          return;
        }
        var odo = K.num(f.odometro.value);
        if (odo == null || odo < 0) throw new Error('Escribe el odómetro actual');
        var m = await K.db.insert('motos', data);
        await K.db.insert('moto_km', { moto_id: m.id, fecha: K.d.today(), odometro: odo });
        V.setActive(m.id);
        K.toast(apodo + ' registrada 🏍️');
      },
      onDelete: isNew ? null : function () {
        if (!confirm('Se borrarán también TODOS sus registros de km y recargas (y los gastos de combustible). ¿Seguro?')) return false;
        return K.db.remove('motos', moto.id).then(function () { K.toast('Moto eliminada'); });
      }
    });
  },

  // ───────── Odómetro ─────────
  kmForm: function (moto, row, fecha) {
    var V = K.views.moto;
    row = row || { fecha: fecha || K.d.today() };
    K.sheet.open({
      title: row.id ? 'Editar odómetro' : 'Odómetro del día',
      html:
        K.field('Fecha', '<input type="date" name="fecha" value="' + row.fecha + '">') +
        K.field('¿Cuánto marca el odómetro? (km)', '<input name="odometro" inputmode="decimal" placeholder="ej. 12345" value="' + (row.odometro != null ? row.odometro : '') + '">') +
        '<div class="preview" data-preview></div>',
      mount: function (f) {
        var nb = null, seq = 0;
        function show() {
          var p = f.querySelector('[data-preview]'), odo = K.num(f.odometro.value);
          if (!nb) { p.innerHTML = ''; return; }
          var lines = [];
          if (nb.prev) {
            lines.push('Anterior: <b>' + K.n1(nb.prev.odometro) + ' km</b> (' + K.esc(K.d.dayLabel(nb.prev.fecha)) + ')');
            if (odo != null) {
              var d = odo - Number(nb.prev.odometro);
              lines.push(d >= 0 ? 'Recorrido: <b class="ok">+' + K.n1(d) + ' km</b>' + (K.d.diff(f.fecha.value, nb.prev.fecha) > 1 ? ' en ' + K.d.diff(f.fecha.value, nb.prev.fecha) + ' días' : '')
                               : '<span class="up">Es menor que el anterior 🤔</span>');
            }
          } else lines.push('Este será tu primer registro (punto de partida).');
          if (nb.same && nb.same.id !== row.id) lines.push('Ya registraste <b>' + K.n1(nb.same.odometro) + ' km</b> este día; se guardará el mayor.');
          p.innerHTML = lines.join('<br>');
        }
        function load() {
          var my = ++seq;
          K.db.kmNeighbors(moto.id, f.fecha.value || K.d.today()).then(function (n) {
            if (my === seq) { nb = n; show(); }
          }).catch(function () {});
        }
        f.fecha.onchange = load;
        f.odometro.oninput = show;
        load();
        if (!row.id) setTimeout(function () { f.odometro.focus(); }, 300);
      },
      submit: async function (f) {
        var fecha = f.fecha.value || K.d.today(), odo = K.num(f.odometro.value);
        if (odo == null || odo < 0) throw new Error('Escribe lo que marca el odómetro');
        var nb = await K.db.kmNeighbors(moto.id, fecha);
        if (nb.prev && odo < Number(nb.prev.odometro))
          throw new Error('No puede ser menor que ' + K.n1(nb.prev.odometro) + ' km (' + K.d.dayLabel(nb.prev.fecha) + ')');
        if (nb.next && odo > Number(nb.next.odometro))
          throw new Error('No puede ser mayor que ' + K.n1(nb.next.odometro) + ' km (' + K.d.dayLabel(nb.next.fecha) + ')');
        var data = { fecha: fecha, odometro: odo, updated_at: new Date().toISOString() };
        var prevKm = nb.prev ? ' (+' + K.n1(odo - Number(nb.prev.odometro)) + ' km)' : '';

        if (row.id) {
          if (nb.same && nb.same.id !== row.id) throw new Error('Ya hay un registro ese día; edítalo a él');
          await K.db.update('moto_km', row.id, data);
          K.toast('Odómetro actualizado' + prevKm);
        } else if (nb.same) {
          if (odo < Number(nb.same.odometro))
            throw new Error('Ese día ya marcaste ' + K.n1(nb.same.odometro) + ' km. El nuevo debe ser mayor (para corregirlo, toca el registro en la lista).');
          await K.db.update('moto_km', nb.same.id, data);
          K.toast('Odómetro actualizado' + prevKm + ' 📍');
        } else {
          await K.db.insert('moto_km', { moto_id: moto.id, fecha: fecha, odometro: odo });
          K.toast('Odómetro guardado' + prevKm + ' 📍');
        }
      },
      onDelete: row.id ? function () { return K.db.remove('moto_km', row.id).then(function () { K.toast('Registro eliminado'); }); } : null
    });
  },

  // Desde la pantalla Hoy
  quickKm: async function (fecha) {
    var motos = await K.db.motos();
    if (!motos.length) { location.hash = 'moto'; return; }
    K.views.moto.kmForm(K.views.moto.active(motos), null, fecha);
  },

  // ───────── Recargas ─────────
  cargaForm: function (moto, row) {
    row = row || { fecha: K.state.month === K.d.ym(K.d.today()) ? K.d.today() : K.state.date };
    var v = function (x) { return x != null ? x : ''; };
    K.sheet.open({
      title: row.id ? 'Editar recarga' : 'Recarga de combustible',
      html:
        '<div class="row2">' +
          K.field('Galones', '<input name="galones" inputmode="decimal" placeholder="ej. 1.5" value="' + v(row.galones) + '">') +
          K.field('Pagaste (S/)', '<input name="total" inputmode="decimal" placeholder="ej. 25.00" value="' + v(row.total) + '">') +
        '</div>' +
        '<div class="preview" data-preview></div>' +
        K.field('Grifo / nota (opcional)', '<input name="nota" placeholder="ej. Primax, 90 oct." value="' + K.esc(row.nota || '') + '">') +
        K.field('Fecha', '<input type="date" name="fecha" value="' + row.fecha + '">') +
        '<p class="muted small">Se registra automáticamente en Gastos como “Combustible”.</p>',
      mount: function (f) {
        function show() {
          var g = K.num(f.galones.value), t = K.num(f.total.value);
          f.querySelector('[data-preview]').innerHTML = g > 0 && t > 0
            ? 'Precio por galón: <b class="ok">' + K.money(t / g) + '</b>' : '';
        }
        f.galones.oninput = f.total.oninput = show;
        show();
        if (!row.id) setTimeout(function () { f.galones.focus(); }, 300);
      },
      submit: async function (f) {
        var g = K.num(f.galones.value), t = K.num(f.total.value);
        if (!(g > 0)) throw new Error('Escribe cuántos galones echaste');
        if (!(t > 0)) throw new Error('Escribe cuánto pagaste');
        var data = { galones: g, total: t, nota: f.nota.value.trim() || null, fecha: f.fecha.value || K.d.today() };
        if (row.id) await K.db.update('moto_cargas', row.id, data);
        else await K.db.insert('moto_cargas', Object.assign({ moto_id: moto.id }, data));
        K.toast((row.id ? 'Recarga actualizada' : 'Recarga guardada') + ' · ' + K.money(t / g) + '/gal ⛽');
      },
      onDelete: row.id ? function () {
        return K.db.remove('moto_cargas', row.id).then(function () { K.toast('Recarga eliminada (y su gasto)'); });
      } : null
    });
  }
};
