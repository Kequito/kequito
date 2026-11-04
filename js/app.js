// Arranque, login y navegación entre secciones
window.K = window.K || {};

K.state = {
  date: K.d.today(),          // día elegido (Hoy, Comidas)
  month: K.d.ym(K.d.today())  // mes elegido (Gastos, Moto, Gym)
};

K.app = {
  current: null,
  _seq: 0,

  start: async function () {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js?v=' + APP_VERSION).catch(function () {});
    }
    var view = document.getElementById('view');
    if (!K.db.configured()) {
      view.innerHTML = '<div class="card center"><h2>Falta configurar Supabase</h2>' +
        '<p class="muted">Abre <b>js/config.js</b> y pega tu URL y tu anon key.</p></div>';
      return;
    }
    K.db.init();
    var session = await K.db.session().catch(function () { return null; });
    if (!session) return K.app.loginScreen();
    K.app.enter();
  },

  loginScreen: function () {
    document.getElementById('tabbar').hidden = true;
    document.getElementById('btnMenu').hidden = true;
    document.getElementById('title').textContent = 'Kequito';
    var view = document.getElementById('view');
    view.innerHTML =
      '<form class="card login" id="loginForm">' +
        '<img class="logo" src="icons/keke.svg" alt="Keke">' +
        '<h2>Hola Kequito :3</h2>' +
        '<p class="muted">Entra para ver tu día a día</p>' +
        K.field('Correo', '<input name="email" type="email" autocomplete="username" autocapitalize="off">') +
        K.field('Contraseña', '<input name="password" type="password" autocomplete="current-password">') +
        '<button class="btn primary block" type="submit">Entrar</button>' +
      '</form>';
    var f = document.getElementById('loginForm');
    f.onsubmit = async function (e) {
      e.preventDefault();
      f.classList.add('busy');
      try {
        await K.db.login(f.email.value.trim(), f.password.value);
        K.app.enter();
      } catch (err) {
        K.toast(err.message, true);
      }
      f.classList.remove('busy');
    };
  },

  enter: function () {
    document.getElementById('tabbar').hidden = false;
    var menu = document.getElementById('btnMenu');
    menu.hidden = false;
    menu.onclick = K.app.menu;
    window.onhashchange = function () { K.app.render(); };
    // Al volver a la app después de un rato, refrescar el día si cambió
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      var t = K.d.today();
      if (K.app._lastToday && K.app._lastToday !== t) {
        if (K.state.date === K.app._lastToday) K.state.date = t;
        if (K.state.month === K.d.ym(K.app._lastToday)) K.state.month = K.d.ym(t);
        K.app.render();
      }
    });
    K.app.render();
  },

  render: async function () {
    var name = (location.hash || '#hoy').slice(1);
    if (!K.views[name]) name = 'hoy';
    var v = K.views[name], view = document.getElementById('view');
    K.app._lastToday = K.d.today();
    if (K.app.current !== name) { window.scrollTo(0, 0); view.innerHTML = '<div class="loading">Cargando…</div>'; }
    K.app.current = name;
    document.getElementById('title').textContent = v.title;
    document.querySelectorAll('#tabbar a').forEach(function (a) {
      a.classList.toggle('active', a.dataset.tab === name);
    });
    var seq = ++K.app._seq, tmp = document.createElement('div');
    try {
      await v.render(tmp);
      if (seq !== K.app._seq) return; // llegó otra navegación mientras cargaba
      view.replaceChildren.apply(view, Array.prototype.slice.call(tmp.childNodes));
    } catch (err) {
      if (seq !== K.app._seq) return;
      view.innerHTML = '<div class="card center"><p>😵 No se pudo cargar</p><p class="muted small">' + K.esc(err.message) +
        '</p><button class="btn primary" onclick="K.app.render()">Reintentar</button></div>';
    }
  },

  menu: function () {
    K.sheet.open({
      title: 'Opciones',
      submitLabel: 'Listo',
      html:
        '<button type="button" class="btn block" data-m="backup">💾 Descargar respaldo (.json)</button>' +
        '<button type="button" class="btn block" data-m="reload">🔄 Recargar app</button>' +
        '<button type="button" class="btn danger block" data-m="logout">Cerrar sesión</button>' +
        '<p class="muted small center">Versión ' + APP_VERSION + '</p>',
      mount: function (f) {
        f.querySelector('[data-m="backup"]').onclick = K.app.backup;
        f.querySelector('[data-m="reload"]').onclick = function () { location.reload(); };
        f.querySelector('[data-m="logout"]').onclick = async function () {
          K.sheet.close();
          await K.db.logout();
          K.app.loginScreen();
        };
      },
      submit: function () { K.sheet.close(); return false; }
    });
  },

  backup: async function () {
    try {
      var out = { app: 'Kequito', version: APP_VERSION, exportado: new Date().toISOString() };
      out.motos = await K.db.all('motos', 'created_at');
      for (var t of ['gastos', 'comidas', 'moto_km', 'moto_cargas', 'gym']) out[t] = await K.db.all(t);
      var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'kequito-respaldo-' + K.d.today() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    } catch (err) {
      K.toast(err.message, true);
    }
  }
};

K.app.start();
