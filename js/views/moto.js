// 🏍️ Kilómetros en moto (+ gasolina opcional)
window.K = window.K || {};
K.views = K.views || {};

K.views.moto = {
  title: 'Moto',

  render: async function (root) {
    var V = K.views.moto, ym = K.state.month, r = K.d.monthRange(ym);
    var rows = await K.db.list('moto', r[0], r[1]);
    var km = 0, gas = 0, litros = 0, dias = {};
    rows.forEach(function (x) {
      km += Number(x.km || 0); gas += Number(x.gasolina || 0); litros += Number(x.litros || 0);
      if (Number(x.km) > 0) dias[x.fecha] = 1;
    });
    var nDias = Object.keys(dias).length;
    var lastOdo = rows.filter(function (x) { return x.odometro != null; })[0];

    root.innerHTML = K.monthNav(ym) +
      '<section class="card accent-moto">' +
        '<div class="big">' + K.n1(km) + ' <small>km</small></div>' +
        '<div class="muted">en ' + nDias + ' día' + (nDias === 1 ? '' : 's') +
          (nDias ? ' · prom. ' + K.n1(km / nDias) + ' km/día' : '') + '</div>' +
        '<div class="stats">' +
          '<div><b>' + K.money(gas) + '</b><small>gasolina</small></div>' +
          '<div><b>' + (litros ? K.n1(litros) + ' L' : '—') + '</b><small>litros</small></div>' +
          '<div><b>' + (litros && km ? K.n1(km / litros) : '—') + '</b><small>km/L</small></div>' +
        '</div>' +
        (lastOdo ? '<div class="muted small">Último odómetro: ' + K.n1(lastOdo.odometro) + ' km (' + K.esc(K.d.dayLabel(lastOdo.fecha)) + ')</div>' : '') +
      '</section>' +
      (rows.length ? K.groupByDay(rows).map(function (g) {
        var dkm = g.rows.reduce(function (s, x) { return s + Number(x.km || 0); }, 0);
        return '<h3 class="day-head"><span>' + K.esc(K.d.dayLabel(g.fecha)) + '</span><span>' + K.n1(dkm) + ' km</span></h3>' +
          '<div class="list">' + g.rows.map(function (x) {
            var sub = [];
            if (x.odometro != null) sub.push('odóm. ' + K.n1(x.odometro));
            if (x.gasolina) sub.push('⛽ ' + K.money(x.gasolina) + (x.litros ? ' · ' + K.n1(x.litros) + ' L' : ''));
            return '<button class="item" data-id="' + x.id + '">' +
              '<span class="item-ico">' + (x.gasolina && !Number(x.km) ? '⛽' : '🏍️') + '</span>' +
              '<span class="item-main"><b>' + K.esc(x.nota || (Number(x.km) ? 'Recorrido' : 'Carga de gasolina')) + '</b>' +
                (sub.length ? '<small>' + K.esc(sub.join(' · ')) + '</small>' : '') + '</span>' +
              '<span class="item-val">' + K.n1(x.km) + ' km</span></button>';
          }).join('') + '</div>';
      }).join('') : K.empty('Sin recorridos este mes')) +
      '<button class="fab accent-moto" data-add>＋</button>';

    K.bindNav(root);
    root.querySelector('[data-add]').onclick = function () { V.openForm(null); };
    root.querySelectorAll('.item').forEach(function (b) {
      b.onclick = function () { V.openForm(rows.filter(function (x) { return x.id === b.dataset.id; })[0]); };
    });
  },

  openForm: function (row, fecha) {
    var isNew = !row;
    row = row || { fecha: fecha || (K.state.month === K.d.ym(K.d.today()) ? K.d.today() : K.state.date) };
    var v = function (x) { return x != null ? x : ''; };
    K.sheet.open({
      title: row.id ? 'Editar recorrido' : 'Nuevo recorrido',
      html:
        K.field('Kilómetros recorridos', '<input name="km" inputmode="decimal" placeholder="ej. 24.5" value="' + v(row.km) + '">',
          'Si lo dejas vacío y pones el odómetro, lo calculo con el último odómetro registrado.') +
        K.field('Odómetro (opcional)', '<input name="odometro" inputmode="decimal" placeholder="km del tablero" value="' + v(row.odometro) + '">') +
        '<div class="row2">' +
          K.field('Gasolina S/ (opcional)', '<input name="gasolina" inputmode="decimal" placeholder="0.00" value="' + v(row.gasolina) + '">') +
          K.field('Litros (opcional)', '<input name="litros" inputmode="decimal" placeholder="0.0" value="' + v(row.litros) + '">') +
        '</div>' +
        (isNew ? '<label class="check"><input type="checkbox" name="comoGasto" checked> Registrar la gasolina también en Gastos</label>' : '') +
        K.field('Nota (opcional)', '<input name="nota" placeholder="ej. casa → trabajo" value="' + K.esc(row.nota || '') + '">') +
        K.field('Fecha', '<input type="date" name="fecha" value="' + row.fecha + '">'),
      mount: function (f) { if (isNew) setTimeout(function () { f.km.focus(); }, 300); },
      submit: async function (f) {
        var data = {
          km: K.num(f.km.value),
          odometro: K.num(f.odometro.value),
          gasolina: K.num(f.gasolina.value),
          litros: K.num(f.litros.value),
          nota: f.nota.value.trim() || null,
          fecha: f.fecha.value || K.d.today()
        };
        if (data.km == null && data.odometro != null) {
          var prev = await K.db.lastOdometer(data.fecha, row.id);
          if (prev == null) throw new Error('No hay un odómetro anterior para calcular. Escribe los km.');
          if (data.odometro < prev) throw new Error('El odómetro (' + data.odometro + ') es menor que el último (' + prev + ')');
          data.km = Math.round((data.odometro - prev) * 10) / 10;
        }
        if (data.km == null) {
          if (!data.gasolina) throw new Error('Escribe los km (o la gasolina si solo cargaste)');
          data.km = 0;
        }
        if (data.km < 0) throw new Error('Los km no pueden ser negativos');
        if (row.id) await K.db.update('moto', row.id, data);
        else await K.db.insert('moto', data);
        if (isNew && f.comoGasto.checked && data.gasolina > 0) {
          await K.db.insert('gastos', { monto: data.gasolina, categoria: 'Moto', nota: 'Gasolina', fecha: data.fecha });
        }
        K.toast(row.id ? 'Recorrido actualizado' : data.km + ' km guardados ✅');
      },
      onDelete: row.id ? function () { return K.db.remove('moto', row.id).then(function () { K.toast('Recorrido eliminado'); }); } : null
    });
  }
};
