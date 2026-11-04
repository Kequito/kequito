// 🍽️ Comidas del día
window.K = window.K || {};
K.views = K.views || {};

K.views.comidas = {
  title: 'Comidas',
  TIPOS: [
    { value: 'Desayuno', label: '☕ Desayuno' },
    { value: 'Almuerzo', label: '🍛 Almuerzo' },
    { value: 'Cena', label: '🌙 Cena' },
    { value: 'Snack', label: '🍪 Snack' }
  ],

  icon: function (tipo) {
    var t = K.views.comidas.TIPOS.filter(function (x) { return x.value === tipo; })[0];
    return t ? t.label.split(' ')[0] : '🍽️';
  },

  render: async function (root) {
    var V = K.views.comidas, date = K.state.date;
    // Día elegido + últimos 6 días para el historial
    var rows = await K.db.list('comidas', K.d.add(date, -6), date);
    var today = rows.filter(function (x) { return x.fecha === date; });
    var kcal = today.reduce(function (s, x) { return s + (x.calorias || 0); }, 0);

    root.innerHTML = K.dayNav(date) +
      '<section class="card accent-comidas">' +
        '<div class="big">' + today.length + ' <small>comida' + (today.length === 1 ? '' : 's') + '</small></div>' +
        '<div class="muted">' + (kcal ? '≈ ' + kcal.toLocaleString('es-PE') + ' kcal registradas' : 'Calorías: opcional') + '</div>' +
      '</section>' +
      V.TIPOS.map(function (t) {
        var items = today.filter(function (x) { return x.tipo === t.value; }).reverse();
        return '<h3 class="day-head"><span>' + t.label + '</span>' +
            '<button class="mini-add" data-add="' + t.value + '">＋</button></h3>' +
          (items.length ? '<div class="list">' + items.map(function (x) {
            return '<button class="item" data-id="' + x.id + '">' +
              '<span class="item-main"><b>' + K.esc(x.descripcion) + '</b>' +
                (x.nota ? '<small>' + K.esc(x.nota) + '</small>' : '') + '</span>' +
              (x.calorias ? '<span class="item-val">' + x.calorias + ' kcal</span>' : '') + '</button>';
          }).join('') + '</div>' : '<div class="slot-empty">—</div>');
      }).join('') +
      V.history(rows.filter(function (x) { return x.fecha !== date; })) +
      '<button class="fab accent-comidas" data-add="">＋</button>';

    K.bindNav(root);
    root.querySelectorAll('[data-add]').forEach(function (b) {
      b.onclick = function () { V.openForm(null, date, b.dataset.add || V.guessTipo()); };
    });
    root.querySelectorAll('.item').forEach(function (b) {
      b.onclick = function () { V.openForm(rows.filter(function (x) { return x.id === b.dataset.id; })[0]); };
    });
  },

  history: function (rows) {
    if (!rows.length) return '';
    return '<h3 class="section-title">Días anteriores</h3>' + K.groupByDay(rows).map(function (g) {
      return '<div class="hist"><b>' + K.esc(K.d.dayLabel(g.fecha)) + '</b> ' +
        g.rows.slice().reverse().map(function (x) {
          return K.views.comidas.icon(x.tipo) + ' ' + K.esc(x.descripcion);
        }).join(' · ') + '</div>';
    }).join('');
  },

  // Tipo sugerido según la hora
  guessTipo: function () {
    var h = new Date().getHours();
    return h < 11 ? 'Desayuno' : h < 16 ? 'Almuerzo' : h < 18 ? 'Snack' : 'Cena';
  },

  openForm: function (row, fecha, tipo) {
    var V = K.views.comidas;
    row = row || { fecha: fecha || K.state.date, tipo: tipo || V.guessTipo() };
    K.sheet.open({
      title: row.id ? 'Editar comida' : 'Nueva comida',
      html:
        K.field('Tipo', K.chips('tipo', V.TIPOS, row.tipo)) +
        K.field('¿Qué comiste?', '<input name="descripcion" placeholder="ej. Arroz con pollo" value="' + K.esc(row.descripcion || '') + '">') +
        K.field('Calorías (opcional)', '<input name="calorias" inputmode="numeric" placeholder="kcal" value="' + (row.calorias != null ? row.calorias : '') + '">') +
        K.field('Nota (opcional)', '<input name="nota" placeholder="ej. en casa, delivery…" value="' + K.esc(row.nota || '') + '">') +
        K.field('Fecha', '<input type="date" name="fecha" value="' + row.fecha + '">'),
      mount: function (f) { if (!row.id) setTimeout(function () { f.descripcion.focus(); }, 300); },
      submit: function (f) {
        var desc = f.descripcion.value.trim();
        if (!desc) throw new Error('Escribe qué comiste');
        var kcal = K.num(f.calorias.value);
        var data = {
          tipo: K.chipValues(f, 'tipo')[0] || 'Almuerzo',
          descripcion: desc,
          calorias: kcal != null ? Math.round(kcal) : null,
          nota: f.nota.value.trim() || null,
          fecha: f.fecha.value || K.d.today()
        };
        return (row.id ? K.db.update('comidas', row.id, data) : K.db.insert('comidas', data))
          .then(function () { K.toast(row.id ? 'Comida actualizada' : 'Comida guardada ✅'); });
      },
      onDelete: row.id ? function () { return K.db.remove('comidas', row.id).then(function () { K.toast('Comida eliminada'); }); } : null
    });
  }
};
