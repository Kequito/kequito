// Utilidades compartidas: formato, fechas, hoja inferior (formularios) y toast
window.K = window.K || {};

K.esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};

// Acepta "12,50" o "12.50" (teclado del iPhone en español usa coma)
K.num = function (v) {
  if (v == null) return null;
  var s = String(v).trim().replace(',', '.');
  if (s === '') return null;
  var n = Number(s);
  return isFinite(n) ? n : null;
};

K.money = function (n) {
  return 'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

K.n1 = function (n) {
  return Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 1 });
};

// ───────── Fechas (siempre como texto 'AAAA-MM-DD' en hora local) ─────────
K.d = {
  pad: function (n) { return (n < 10 ? '0' : '') + n; },
  str: function (dt) { return dt.getFullYear() + '-' + K.d.pad(dt.getMonth() + 1) + '-' + K.d.pad(dt.getDate()); },
  parse: function (s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); },
  today: function () { return K.d.str(new Date()); },
  add: function (s, days) { var dt = K.d.parse(s); dt.setDate(dt.getDate() + days); return K.d.str(dt); },
  ym: function (s) { return s.slice(0, 7); },
  addMonths: function (ym, n) {
    var p = ym.split('-'), dt = new Date(+p[0], +p[1] - 1 + n, 1);
    return dt.getFullYear() + '-' + K.d.pad(dt.getMonth() + 1);
  },
  monthRange: function (ym) {
    var p = ym.split('-'), last = new Date(+p[0], +p[1], 0).getDate();
    return [ym + '-01', ym + '-' + K.d.pad(last)];
  },
  weekStart: function (s) { // lunes
    var dt = K.d.parse(s), wd = (dt.getDay() + 6) % 7;
    dt.setDate(dt.getDate() - wd); return K.d.str(dt);
  },
  diff: function (a, b) { return Math.round((K.d.parse(a) - K.d.parse(b)) / 86400000); },
  DIAS: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  MESES: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  dayLabel: function (s) {
    var t = K.d.today();
    if (s === t) return 'Hoy';
    if (s === K.d.add(t, -1)) return 'Ayer';
    if (s === K.d.add(t, 1)) return 'Mañana';
    var dt = K.d.parse(s);
    return K.d.DIAS[dt.getDay()] + ' ' + dt.getDate() + ' ' + K.d.MESES[dt.getMonth()].slice(0, 3);
  },
  longLabel: function (s) {
    var dt = K.d.parse(s);
    return K.d.DIAS[dt.getDay()] + ' ' + dt.getDate() + ' de ' + K.d.MESES[dt.getMonth()];
  },
  monthLabel: function (ym) {
    var p = ym.split('-');
    var m = K.d.MESES[+p[1] - 1];
    return m.charAt(0).toUpperCase() + m.slice(1) + ' ' + p[0];
  }
};

// Agrupa filas por fecha → [{fecha, rows}] ordenado desc
K.groupByDay = function (rows) {
  var map = {}, out = [];
  rows.forEach(function (r) { (map[r.fecha] = map[r.fecha] || []).push(r); });
  Object.keys(map).sort().reverse().forEach(function (f) { out.push({ fecha: f, rows: map[f] }); });
  return out;
};

// ───────── Navegadores de día / mes ─────────
K.dayNav = function (date) {
  return '<div class="navbar">' +
    '<button class="nav-btn" data-nav="-1" aria-label="Día anterior">‹</button>' +
    '<label class="nav-label">' + K.esc(K.d.dayLabel(date)) +
      '<input type="date" class="nav-date" value="' + date + '"></label>' +
    '<button class="nav-btn" data-nav="1" aria-label="Día siguiente">›</button>' +
  '</div>';
};
K.monthNav = function (ym) {
  return '<div class="navbar">' +
    '<button class="nav-btn" data-mnav="-1" aria-label="Mes anterior">‹</button>' +
    '<div class="nav-label">' + K.d.monthLabel(ym) + '</div>' +
    '<button class="nav-btn" data-mnav="1" aria-label="Mes siguiente">›</button>' +
  '</div>';
};
// Conecta los botones de navegación dentro de root
K.bindNav = function (root) {
  root.querySelectorAll('[data-nav]').forEach(function (b) {
    b.onclick = function () { K.state.date = K.d.add(K.state.date, +b.dataset.nav); K.app.render(); };
  });
  root.querySelectorAll('.nav-date').forEach(function (inp) {
    inp.onchange = function () { if (inp.value) { K.state.date = inp.value; K.app.render(); } };
  });
  root.querySelectorAll('[data-mnav]').forEach(function (b) {
    b.onclick = function () { K.state.month = K.d.addMonths(K.state.month, +b.dataset.mnav); K.app.render(); };
  });
};

// ───────── Toast ─────────
K.toast = function (msg, isError) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  t.hidden = false;
  clearTimeout(K.toast._t);
  K.toast._t = setTimeout(function () { t.hidden = true; }, isError ? 4000 : 2000);
};

// ───────── Hoja inferior con formulario ─────────
// opts: { title, html, mount(root), submit(root) → Promise, onDelete() → Promise, submitLabel }
K.sheet = {
  open: function (opts) {
    K.sheet.close();
    var ov = document.createElement('div');
    ov.className = 'sheet-overlay';
    ov.innerHTML =
      '<form class="sheet" novalidate>' +
        '<div class="sheet-head">' +
          '<button type="button" class="link-btn" data-act="cancel">Cancelar</button>' +
          '<h2>' + K.esc(opts.title) + '</h2>' +
          '<button type="submit" class="link-btn strong">' + K.esc(opts.submitLabel || 'Guardar') + '</button>' +
        '</div>' +
        '<div class="sheet-body">' + opts.html +
          (opts.onDelete ? '<button type="button" class="btn danger block" data-act="delete">Eliminar</button>' : '') +
        '</div>' +
      '</form>';
    document.body.appendChild(ov);
    document.body.classList.add('no-scroll');
    K.sheet._el = ov;
    var form = ov.querySelector('form');
    requestAnimationFrame(function () { ov.classList.add('open'); });

    ov.addEventListener('click', function (e) { if (e.target === ov) K.sheet.close(); });
    ov.querySelector('[data-act="cancel"]').onclick = K.sheet.close;
    var busy = false;
    function run(fn) {
      if (busy) return;
      busy = true; form.classList.add('busy');
      Promise.resolve().then(fn).then(function (ok) {
        if (ok !== false) { K.sheet.close(); K.app.render(); }
      }).catch(function (err) {
        K.toast(err && err.message ? err.message : String(err), true);
      }).then(function () { busy = false; form.classList.remove('busy'); });
    }
    form.onsubmit = function (e) { e.preventDefault(); run(function () { return opts.submit(form); }); };
    if (opts.onDelete) {
      ov.querySelector('[data-act="delete"]').onclick = function () {
        if (confirm('¿Eliminar este registro?')) run(opts.onDelete);
      };
    }
    if (opts.mount) opts.mount(form);
    return form;
  },
  close: function () {
    var ov = K.sheet._el;
    if (!ov) return;
    K.sheet._el = null;
    document.body.classList.remove('no-scroll');
    ov.classList.remove('open');
    setTimeout(function () { ov.remove(); }, 250);
  }
};

// Campo de formulario
K.field = function (label, inner, hint) {
  return '<label class="field"><span>' + K.esc(label) + '</span>' + inner +
    (hint ? '<small>' + K.esc(hint) + '</small>' : '') + '</label>';
};

// Grupo de chips (radio o checkbox). opts: [{value, label}] o strings
K.chips = function (name, options, selected, multi) {
  var sel = [].concat(selected || []);
  return '<div class="chips">' + options.map(function (o) {
    var v = typeof o === 'string' ? o : o.value, l = typeof o === 'string' ? o : o.label;
    return '<label class="chip"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + name +
      '" value="' + K.esc(v) + '"' + (sel.indexOf(v) >= 0 ? ' checked' : '') + '><span>' + K.esc(l) + '</span></label>';
  }).join('') + '</div>';
};
K.chipValues = function (root, name) {
  return [].map.call(root.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; });
};

K.empty = function (msg) { return '<div class="empty">' + K.esc(msg) + '</div>'; };
