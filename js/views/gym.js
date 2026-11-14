// 🏋️ Gym: días asistidos + grupos musculares o rutina detallada
window.K = window.K || {};
K.views = K.views || {};

K.views.gym = {
  title: 'Gym',
  GRUPOS: ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Antebrazo', 'Piernas', 'Glúteos', 'Pantorrillas', 'Abdomen', 'Cardio'],

  // Color por grupo, en familias por zona del cuerpo
  COLORES: {
    'Pecho': '#ff5d6c', 'Hombros': '#ff9248',                          // torso (empuje): rojos / naranja
    'Espalda': '#4aa8ff',                                               // espalda: azul
    'Bíceps': '#a78bfa', 'Tríceps': '#7c6cff', 'Antebrazo': '#d4a5ff',  // brazos: morados
    'Piernas': '#34d399', 'Glúteos': '#84cc16', 'Pantorrillas': '#c3f05a', // piernas: verdes
    'Abdomen': '#ffd84a',                                               // core: amarillo
    'Cardio': '#ff6fae'                                                 // cardio: rosa
  },
  color: function (g) { return K.views.gym.COLORES[g] || 'var(--gym)'; },

  // Fondo con los colores de los grupos (dividido en franjas si son varios)
  fondo: function (grupos) {
    var V = K.views.gym, cs = [];
    grupos.forEach(function (g) { var c = V.color(g); if (cs.indexOf(c) < 0) cs.push(c); });
    cs = cs.slice(0, 4);
    if (!cs.length) return 'var(--gym)';
    if (cs.length === 1) return cs[0];
    var step = 100 / cs.length;
    return 'linear-gradient(135deg,' + cs.map(function (c, i) {
      return c + ' ' + (i * step).toFixed(1) + '% ' + ((i + 1) * step).toFixed(1) + '%';
    }).join(',') + ')';
  },

  // Etiquetas de colores con los grupos
  tags: function (grupos) {
    var V = K.views.gym;
    if (!grupos || !grupos.length) return '<b>Entrenamiento</b>';
    return '<span class="gtags">' + grupos.map(function (g) {
      return '<span class="gtag" style="--c:' + V.color(g) + '">' + K.esc(g) + '</span>';
    }).join('') + '</span>';
  },

  // Estadísticas a partir de una lista de fechas (cualquier orden)
  stats: function (fechas) {
    var t = K.d.today(), set = {}, weeks = {};
    fechas.forEach(function (f) { set[f] = 1; weeks[K.d.weekStart(f)] = 1; });
    var days = Object.keys(set).sort();
    var ws = K.d.weekStart(t), mes = K.d.ym(t), anio = t.slice(0, 4);
    // Racha: semanas seguidas con al menos 1 día (la semana actual no rompe la racha si aún no vas)
    var racha = 0, w = weeks[ws] ? ws : K.d.add(ws, -7);
    while (weeks[w]) { racha++; w = K.d.add(w, -7); }
    var last = days.filter(function (f) { return f <= t; }).pop();
    return {
      semana: days.filter(function (f) { return f >= ws && f <= t; }).length,
      mes: days.filter(function (f) { return K.d.ym(f) === mes; }).length,
      anio: days.filter(function (f) { return f.slice(0, 4) === anio; }).length,
      racha: racha,
      last: last,
      hace: last ? K.d.diff(t, last) : null
    };
  },

  summary: function (x) {
    if (x.modo === 'detalle' && x.ejercicios && x.ejercicios.length) {
      var series = x.ejercicios.reduce(function (s, e) { return s + (e.series || []).length; }, 0);
      return x.ejercicios.length + ' ejercicio' + (x.ejercicios.length === 1 ? '' : 's') + ' · ' + series + ' series';
    }
    return 'Grupos musculares';
  },

  render: async function (root) {
    var V = K.views.gym, ym = K.state.month, r = K.d.monthRange(ym), t = K.d.today();
    var res = await Promise.all([
      K.db.list('gym', r[0], r[1]),
      K.db.list('gym', t.slice(0, 4) - 1 + '-12-01', t, 'fecha')
    ]);
    var rows = res[0], st = V.stats(res[1].map(function (x) { return x.fecha; }));
    var byDay = {};
    rows.forEach(function (x) { (byDay[x.fecha] = byDay[x.fecha] || []).push(x); });
    var mesDias = Object.keys(byDay).length;

    // Calendario (lunes a domingo)
    var first = K.d.parse(r[0]), offset = (first.getDay() + 6) % 7, last = +r[1].slice(8), cells = '';
    for (var i = 0; i < offset; i++) cells += '<span></span>';
    var conteo = {}; // días por grupo en el mes
    for (var d = 1; d <= last; d++) {
      var f = ym + '-' + K.d.pad(d), grupos = [];
      (byDay[f] || []).forEach(function (x) {
        x.grupos.forEach(function (g) { if (grupos.indexOf(g) < 0) grupos.push(g); });
      });
      grupos.forEach(function (g) { conteo[g] = (conteo[g] || 0) + 1; });
      cells += '<button class="cal-day' + (byDay[f] ? ' on' : '') + (f === t ? ' today' : '') + '" data-day="' + f + '"' +
        (byDay[f] ? ' style="background:' + V.fondo(grupos) + '"' : '') + '>' + d + '</button>';
    }
    var leyenda = Object.keys(conteo).sort(function (a, b) {
      return conteo[b] - conteo[a] || V.GRUPOS.indexOf(a) - V.GRUPOS.indexOf(b);
    }).map(function (g) {
      return '<span><i style="background:' + V.color(g) + '"></i>' + K.esc(g) + ' <b>' + conteo[g] + '</b></span>';
    }).join('');

    root.innerHTML = K.monthNav(ym) +
      '<section class="card accent-gym">' +
        '<div class="stats">' +
          '<div><b>' + st.semana + '</b><small>esta semana</small></div>' +
          '<div><b>' + mesDias + '</b><small>' + (ym === K.d.ym(t) ? 'este mes' : 'en el mes') + '</small></div>' +
          '<div><b>' + st.racha + '</b><small>semanas seguidas</small></div>' +
        '</div>' +
        '<div class="muted small">' + st.anio + ' días en ' + t.slice(0, 4) + ' · ' +
          (st.hace == null ? 'aún sin registros' : st.hace === 0 ? 'fuiste hoy 💪' : 'última vez hace ' + st.hace + ' día' + (st.hace === 1 ? '' : 's')) +
        '</div>' +
        '<div class="cal-head"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>' +
        '<div class="cal">' + cells + '</div>' +
        (leyenda ? '<div class="legend">' + leyenda + '</div>' : '') +
      '</section>' +
      (rows.length ? '<div class="list">' + rows.map(function (x) {
        return '<button class="item" data-id="' + x.id + '">' +
          '<span class="gdot" style="background:' + V.fondo(x.grupos) + '"></span>' +
          '<span class="item-main">' + V.tags(x.grupos) +
            '<small>' + K.esc(K.d.dayLabel(x.fecha) + ' · ' + V.summary(x) + (x.duracion ? ' · ' + x.duracion + ' min' : '')) + '</small></span>' +
          '</button>';
      }).join('') + '</div>' : K.empty('Sin entrenamientos este mes')) +
      '<button class="fab accent-gym" data-add>＋</button>';

    K.bindNav(root);
    root.querySelector('[data-add]').onclick = function () { V.openForm(null); };
    root.querySelectorAll('.item').forEach(function (b) {
      b.onclick = function () { V.openForm(rows.filter(function (x) { return x.id === b.dataset.id; })[0]); };
    });
    root.querySelectorAll('[data-day]').forEach(function (b) {
      b.onclick = function () {
        var s = byDay[b.dataset.day];
        V.openForm(s ? s[0] : null, b.dataset.day);
      };
    });
  },

  // ───────── Formulario ─────────
  setRow: function (s) {
    s = s || {};
    return '<div class="set"><span class="set-n"></span>' +
      '<input class="s-reps" inputmode="numeric" placeholder="reps" value="' + (s.reps != null ? s.reps : '') + '">' +
      '<span class="x">×</span>' +
      '<input class="s-peso" inputmode="decimal" placeholder="kg" value="' + (s.peso != null ? s.peso : '') + '">' +
      '<button type="button" class="s-del" aria-label="Quitar serie">−</button></div>';
  },
  exBlock: function (e) {
    var V = K.views.gym;
    e = e || { series: [{}] };
    return '<div class="ex">' +
      '<div class="ex-head">' +
        '<input class="ex-name" list="exList" placeholder="Ejercicio (ej. Press banca)" value="' + K.esc(e.nombre || '') + '">' +
        '<button type="button" class="ex-del" aria-label="Quitar ejercicio">✕</button>' +
      '</div>' +
      '<select class="ex-grupo"><option value="">Grupo…</option>' + V.GRUPOS.map(function (g) {
        return '<option' + (g === e.grupo ? ' selected' : '') + '>' + g + '</option>';
      }).join('') + '</select>' +
      '<div class="sets">' + (e.series && e.series.length ? e.series : [{}]).map(V.setRow).join('') + '</div>' +
      '<button type="button" class="btn ghost small s-add">＋ Serie</button>' +
    '</div>';
  },

  openForm: function (row, fecha) {
    var V = K.views.gym;
    row = row || { fecha: fecha || (K.state.month === K.d.ym(K.d.today()) ? K.d.today() : K.state.date), modo: 'grupos', grupos: [], ejercicios: [] };
    K.sheet.open({
      title: row.id ? 'Editar entrenamiento' : 'Nuevo entrenamiento',
      html:
        K.field('Fecha', '<input type="date" name="fecha" value="' + row.fecha + '">') +
        '<div class="seg">' +
          '<label><input type="radio" name="modo" value="grupos"' + (row.modo !== 'detalle' ? ' checked' : '') + '><span>Solo grupos</span></label>' +
          '<label><input type="radio" name="modo" value="detalle"' + (row.modo === 'detalle' ? ' checked' : '') + '><span>Rutina detallada</span></label>' +
        '</div>' +
        K.field('Grupos trabajados', K.chips('grupos', V.GRUPOS, row.grupos, true)) +
        '<div class="detalle">' +
          '<datalist id="exList"></datalist>' +
          '<div class="exs">' + (row.ejercicios.length ? row.ejercicios : [null]).map(V.exBlock).join('') + '</div>' +
          '<button type="button" class="btn ghost block ex-add">＋ Agregar ejercicio</button>' +
        '</div>' +
        '<div class="row2">' +
          K.field('Duración (min)', '<input name="duracion" inputmode="numeric" placeholder="ej. 60" value="' + (row.duracion != null ? row.duracion : '') + '">') +
          K.field('Nota', '<input name="nota" placeholder="ej. me sentí 🔥" value="' + K.esc(row.nota || '') + '">') +
        '</div>',
      mount: function (f) {
        var exs = f.querySelector('.exs'), known = {};
        function syncModo() { f.classList.toggle('modo-detalle', K.chipValues(f, 'modo')[0] === 'detalle'); }
        function renumber() {
          f.querySelectorAll('.sets').forEach(function (s) {
            s.querySelectorAll('.set-n').forEach(function (n, i) { n.textContent = i + 1; });
          });
        }
        function checkGroup(g) {
          var c = f.querySelector('input[name="grupos"][value="' + g + '"]');
          if (c) c.checked = true;
        }
        f.querySelectorAll('input[name="modo"]').forEach(function (r) { r.onchange = syncModo; });
        // Cada chip de grupo con su color
        f.querySelectorAll('input[name="grupos"]').forEach(function (i) {
          i.parentNode.classList.add('gchip');
          i.parentNode.style.setProperty('--c', V.color(i.value));
        });
        syncModo(); renumber();

        f.querySelector('.ex-add').onclick = function () {
          exs.insertAdjacentHTML('beforeend', V.exBlock(null));
          exs.lastElementChild.querySelector('.ex-name').focus();
          renumber();
        };
        f.addEventListener('click', function (e) {
          var t = e.target;
          if (t.classList.contains('s-add')) {
            var sets = t.previousElementSibling, prev = sets.lastElementChild;
            sets.insertAdjacentHTML('beforeend', V.setRow(prev ? {
              reps: prev.querySelector('.s-reps').value, peso: prev.querySelector('.s-peso').value
            } : null));
            renumber();
          } else if (t.classList.contains('s-del')) {
            var s = t.closest('.sets');
            if (s.children.length > 1) t.parentNode.remove(); else t.parentNode.querySelectorAll('input').forEach(function (i) { i.value = ''; });
            renumber();
          } else if (t.classList.contains('ex-del')) {
            if (exs.children.length > 1) t.closest('.ex').remove();
            else exs.innerHTML = V.exBlock(null);
            renumber();
          }
        });
        f.addEventListener('change', function (e) {
          var t = e.target;
          if (t.classList.contains('ex-grupo') && t.value) checkGroup(t.value);
          if (t.classList.contains('ex-name')) {
            var g = known[t.value.trim()], sel = t.closest('.ex').querySelector('.ex-grupo');
            if (g && !sel.value) { sel.value = g; checkGroup(g); }
          }
        });
        // Autocompletar con ejercicios usados antes
        K.db.exerciseNames().then(function (names) {
          known = names;
          f.querySelector('#exList').innerHTML = Object.keys(names).sort().map(function (n) {
            return '<option value="' + K.esc(n) + '">';
          }).join('');
        }).catch(function () {});
      },
      submit: function (f) {
        var modo = K.chipValues(f, 'modo')[0] || 'grupos';
        var grupos = K.chipValues(f, 'grupos'), ejercicios = [];
        if (modo === 'detalle') {
          f.querySelectorAll('.ex').forEach(function (ex) {
            var nombre = ex.querySelector('.ex-name').value.trim();
            if (!nombre) return;
            var grupo = ex.querySelector('.ex-grupo').value;
            var series = [];
            ex.querySelectorAll('.set').forEach(function (s) {
              var reps = K.num(s.querySelector('.s-reps').value), peso = K.num(s.querySelector('.s-peso').value);
              if (reps != null || peso != null) series.push({ reps: reps, peso: peso });
            });
            ejercicios.push({ nombre: nombre, grupo: grupo, series: series });
            if (grupo && grupos.indexOf(grupo) < 0) grupos.push(grupo);
          });
          if (!ejercicios.length) throw new Error('Agrega al menos un ejercicio (o usa "Solo grupos")');
        }
        if (!grupos.length && modo === 'grupos') throw new Error('Elige al menos un grupo muscular');
        grupos.sort(function (a, b) { return V.GRUPOS.indexOf(a) - V.GRUPOS.indexOf(b); });
        var dur = K.num(f.duracion.value);
        var data = {
          fecha: f.fecha.value || K.d.today(),
          modo: modo,
          grupos: grupos,
          ejercicios: ejercicios,
          duracion: dur != null ? Math.round(dur) : null,
          nota: f.nota.value.trim() || null
        };
        return (row.id ? K.db.update('gym', row.id, data) : K.db.insert('gym', data))
          .then(function () { K.toast(row.id ? 'Entrenamiento actualizado' : 'Entrenamiento guardado 💪'); });
      },
      onDelete: row.id ? function () { return K.db.remove('gym', row.id).then(function () { K.toast('Entrenamiento eliminado'); }); } : null
    });
  }
};
