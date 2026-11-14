// 🏠 Resumen del día
window.K = window.K || {};
K.views = K.views || {};

K.views.hoy = {
  title: 'Hoy',

  render: async function (root) {
    var date = K.state.date, ym = K.d.ym(date), r = K.d.monthRange(ym);
    var res = await Promise.all([
      K.db.list('gastos', r[0], r[1]),
      K.db.list('comidas', date, date),
      K.db.kmAll(K.d.add(r[0], -62), K.d.add(r[1], 62)),
      K.db.list('gym', K.d.add(date, -400), K.d.today(), 'id, fecha, grupos, modo, ejercicios, duracion, nota, created_at'),
      K.db.descansos(null, K.d.add(r[0], -62), K.d.add(r[1], 62))
    ]);
    var gastos = res[0], comidas = res[1], moto = res[2], gym = res[3];
    var sum = function (rows, k) { return rows.reduce(function (s, x) { return s + Number(x[k] || 0); }, 0); };
    var gHoy = gastos.filter(function (x) { return x.fecha === date; });
    // Km por día de cada moto, repartidos entre los días sin contar los "No recorrido"
    var porMoto = {}, libresPorMoto = {}, kmHoy = 0, kmMes = 0, mHoy = [], libreHoy = false;
    moto.forEach(function (x) { (porMoto[x.moto_id] = porMoto[x.moto_id] || []).push(x); });
    res[4].forEach(function (x) {
      (libresPorMoto[x.moto_id] = libresPorMoto[x.moto_id] || {})[x.fecha] = x;
      if (x.fecha === date) libreHoy = true;
    });
    Object.keys(porMoto).forEach(function (id) {
      var rep = K.views.moto.reparto(porMoto[id], null, libresPorMoto[id] || {});
      Object.keys(rep.porDia).forEach(function (f) { if (K.d.ym(f) === ym) kmMes += rep.porDia[f]; });
      if (rep.porDia[date] != null) {
        kmHoy += rep.porDia[date];
        var e = rep.entries.filter(function (x) { return x.row.fecha >= date && x.km != null; })[0];
        mHoy.push({ km: rep.porDia[date], reg: e && e.row.fecha === date ? e : null });
      }
    });
    var gymHoy = gym.filter(function (x) { return x.fecha === date; });
    var st = K.views.gym.stats(gym.map(function (x) { return x.fecha; }));
    var gymMes = {};
    gym.forEach(function (x) { if (K.d.ym(x.fecha) === ym) gymMes[x.fecha] = 1; });

    var tiposHechos = comidas.map(function (x) { return x.tipo; });
    var h = new Date().getHours();
    var saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';

    root.innerHTML =
      (date === K.d.today() ? '<p class="hello">' + saludo + ' :3 <span>' + K.esc(K.d.longLabel(date)) + '</span></p>' : '') +
      K.dayNav(date) +
      '<div class="grid">' +
        // Gastos
        '<section class="tile accent-gastos" data-go="gastos">' +
          '<div class="tile-top"><span>💸 Gastos</span><button class="mini-add" data-quick="gastos">＋</button></div>' +
          '<div class="big">' + K.money(sum(gHoy, 'monto')) + '</div>' +
          '<div class="muted small">' + gHoy.length + ' hoy · mes ' + K.money(sum(gastos, 'monto')) + '</div>' +
        '</section>' +
        // Moto
        '<section class="tile accent-moto" data-go="moto">' +
          '<div class="tile-top"><span>🏍️ Moto</span><button class="mini-add" data-quick="moto">＋</button></div>' +
          '<div class="big">' + (libreHoy && !mHoy.length ? '😴' : K.n1(kmHoy) + ' <small>km</small>') + '</div>' +
          '<div class="muted small">' + (libreHoy && !mHoy.length ? 'no recorrido · ' : '') + 'mes ' + K.n1(kmMes) + ' km</div>' +
        '</section>' +
        // Gym
        '<section class="tile accent-gym" data-go="gym">' +
          '<div class="tile-top"><span>🏋️ Gym</span><button class="mini-add" data-quick="gym">＋</button></div>' +
          '<div class="big">' + (gymHoy.length ? '✅' : '—') + '</div>' +
          '<div class="muted small">' + (gymHoy.length ? K.esc(gymHoy[0].grupos.join(', ') || 'Entrenado') :
            Object.keys(gymMes).length + (Object.keys(gymMes).length === 1 ? ' día' : ' días') + ' en el mes · racha ' + st.racha + ' sem') + '</div>' +
        '</section>' +
        // Comidas
        '<section class="tile accent-comidas" data-go="comidas">' +
          '<div class="tile-top"><span>🍽️ Comidas</span><button class="mini-add" data-quick="comidas">＋</button></div>' +
          '<div class="meal-dots">' + K.views.comidas.TIPOS.map(function (t) {
            return '<span class="' + (tiposHechos.indexOf(t.value) >= 0 ? 'on' : '') + '" title="' + t.value + '">' + t.label.split(' ')[0] + '</span>';
          }).join('') + '</div>' +
          '<div class="muted small">' + comidas.length + ' registrada' + (comidas.length === 1 ? '' : 's') + '</div>' +
        '</section>' +
      '</div>' +
      // Lo de hoy en detalle
      '<h3 class="section-title">Lo de ' + (date === K.d.today() ? 'hoy' : 'este día') + '</h3>' +
      (gHoy.length + comidas.length + mHoy.length + gymHoy.length ? '<div class="list">' +
        comidas.slice().reverse().map(function (x) {
          return '<div class="item static"><span class="item-ico">' + K.views.comidas.icon(x.tipo) + '</span>' +
            '<span class="item-main"><b>' + K.esc(x.descripcion) + '</b><small>' + K.esc(x.tipo) + '</small></span></div>';
        }).join('') +
        gHoy.map(function (x) {
          return '<div class="item static"><span class="item-ico">' + (x.origen === 'moto' ? '⛽' : K.views.gastos.icon(x.categoria)) + '</span>' +
            '<span class="item-main"><b>' + K.esc(x.nota || x.categoria) + '</b><small>Gasto</small></span>' +
            '<span class="item-val">' + K.money(x.monto) + '</span></div>';
        }).join('') +
        mHoy.map(function (m) {
          return '<div class="item static"><span class="item-ico">🏍️</span>' +
            '<span class="item-main"><b>Recorrido</b><small>' + (m.reg
              ? 'Odómetro ' + K.n1(m.reg.row.odometro) + ' km' + (m.reg.dias > 1 ? ' · +' + K.n1(m.reg.km) + ' km en ' + m.reg.dias + ' días' : '')
              : 'Sin registro · km repartidos') + '</small></span>' +
            '<span class="item-val">+' + K.n1(m.km) + ' km</span></div>';
        }).join('') +
        gymHoy.map(function (x) {
          return '<div class="item static"><span class="gdot" style="background:' + K.views.gym.fondo(x.grupos) + '"></span>' +
            '<span class="item-main">' + K.views.gym.tags(x.grupos) + '<small>' + K.esc(K.views.gym.summary(x)) + '</small></span></div>';
        }).join('') +
      '</div>' : K.empty('Nada registrado todavía. Toca ＋ en cualquier tarjeta 👆'));

    K.bindNav(root);
    root.querySelectorAll('[data-go]').forEach(function (s) {
      s.onclick = function () {
        if (s.dataset.go === 'comidas') K.state.date = date; else K.state.month = ym;
        location.hash = s.dataset.go;
      };
    });
    root.querySelectorAll('[data-quick]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var v = K.views[b.dataset.quick];
        if (b.dataset.quick === 'comidas') v.openForm(null, date, K.views.comidas.guessTipo());
        else if (b.dataset.quick === 'moto') K.views.moto.quickKm(date).catch(function (err) { K.toast(err.message, true); });
        else if (b.dataset.quick === 'gym' && gymHoy.length) v.openForm(gymHoy[0]);
        else v.openForm(null, date);
      };
    });
  }
};
