// 💸 Gastos diarios
window.K = window.K || {};
K.views = K.views || {};

K.views.gastos = {
  title: 'Gastos',
  CATS: [
    { value: 'Comida', label: '🍔 Comida' },
    { value: 'Transporte', label: '🚌 Transporte' },
    { value: 'Moto', label: '🏍️ Moto' },
    { value: 'Casa', label: '🏠 Casa' },
    { value: 'Servicios', label: '💡 Servicios' },
    { value: 'Salud', label: '💊 Salud' },
    { value: 'Gym', label: '🏋️ Gym' },
    { value: 'Ocio', label: '🎉 Ocio' },
    { value: 'Compras', label: '🛍️ Compras' },
    { value: 'Otros', label: '📦 Otros' }
  ],

  icon: function (cat) {
    var c = K.views.gastos.CATS.filter(function (x) { return x.value === cat; })[0];
    return c ? c.label.split(' ')[0] : '📦';
  },

  render: async function (root) {
    var V = K.views.gastos, ym = K.state.month, r = K.d.monthRange(ym);
    var rows = await K.db.list('gastos', r[0], r[1]);
    var total = rows.reduce(function (s, x) { return s + Number(x.monto); }, 0);

    // Por categoría
    var byCat = {};
    rows.forEach(function (x) { byCat[x.categoria] = (byCat[x.categoria] || 0) + Number(x.monto); });
    var cats = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });
    var max = cats.length ? byCat[cats[0]] : 1;

    // Promedio diario (hasta hoy si es el mes actual)
    var days = ym === K.d.ym(K.d.today()) ? +K.d.today().slice(8) : +r[1].slice(8);
    if (ym > K.d.ym(K.d.today())) days = 1;

    root.innerHTML = K.monthNav(ym) +
      '<section class="card accent-gastos">' +
        '<div class="big">' + K.money(total) + '</div>' +
        '<div class="muted">Total del mes · ' + rows.length + ' gastos · prom. ' + K.money(total / days) + '/día</div>' +
        (cats.length ? '<div class="bars">' + cats.map(function (c) {
          return '<div class="bar-row"><span>' + V.icon(c) + ' ' + K.esc(c) + '</span>' +
            '<div class="bar"><i style="width:' + (byCat[c] / max * 100).toFixed(1) + '%"></i></div>' +
            '<b>' + K.money(byCat[c]) + '</b></div>';
        }).join('') + '</div>' : '') +
      '</section>' +
      (rows.length ? K.groupByDay(rows).map(function (g) {
        var dayTotal = g.rows.reduce(function (s, x) { return s + Number(x.monto); }, 0);
        return '<h3 class="day-head"><span>' + K.esc(K.d.dayLabel(g.fecha)) + '</span><span>' + K.money(dayTotal) + '</span></h3>' +
          '<div class="list">' + g.rows.map(function (x) {
            return '<button class="item" data-id="' + x.id + '">' +
              '<span class="item-ico">' + V.icon(x.categoria) + '</span>' +
              '<span class="item-main"><b>' + K.esc(x.nota || x.categoria) + '</b>' +
                (x.nota ? '<small>' + K.esc(x.categoria) + '</small>' : '') + '</span>' +
              '<span class="item-val">' + K.money(x.monto) + '</span></button>';
          }).join('') + '</div>';
      }).join('') : K.empty('Sin gastos este mes')) +
      '<button class="fab accent-gastos" data-add>＋</button>';

    K.bindNav(root);
    root.querySelector('[data-add]').onclick = function () { V.openForm(null); };
    root.querySelectorAll('.item').forEach(function (b) {
      b.onclick = function () { V.openForm(rows.filter(function (x) { return x.id === b.dataset.id; })[0]); };
    });
  },

  openForm: function (row, fecha) {
    var V = K.views.gastos;
    row = row || { fecha: fecha || (K.state.month === K.d.ym(K.d.today()) ? K.d.today() : K.state.date), categoria: 'Comida' };
    K.sheet.open({
      title: row.id ? 'Editar gasto' : 'Nuevo gasto',
      html:
        K.field('Monto (S/)', '<input name="monto" inputmode="decimal" placeholder="0.00" autocomplete="off" value="' + (row.monto != null ? row.monto : '') + '">') +
        K.field('Categoría', K.chips('categoria', V.CATS, row.categoria)) +
        K.field('Detalle (opcional)', '<input name="nota" placeholder="ej. Menú, pasaje…" value="' + K.esc(row.nota || '') + '">') +
        K.field('Fecha', '<input type="date" name="fecha" value="' + row.fecha + '">'),
      mount: function (f) { if (!row.id) setTimeout(function () { f.monto.focus(); }, 300); },
      submit: function (f) {
        var monto = K.num(f.monto.value);
        if (!monto || monto <= 0) throw new Error('Ingresa un monto válido');
        var data = {
          monto: monto,
          categoria: K.chipValues(f, 'categoria')[0] || 'Otros',
          nota: f.nota.value.trim() || null,
          fecha: f.fecha.value || K.d.today()
        };
        return (row.id ? K.db.update('gastos', row.id, data) : K.db.insert('gastos', data))
          .then(function () { K.toast(row.id ? 'Gasto actualizado' : 'Gasto guardado ✅'); });
      },
      onDelete: row.id ? function () { return K.db.remove('gastos', row.id).then(function () { K.toast('Gasto eliminado'); }); } : null
    });
  }
};
