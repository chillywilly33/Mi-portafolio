/* Arranque, navegación y estructura general. */
(function (g) {
  const App = g.App;
  const ic = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const NAV = [
    ['portafolio', 'Portafolio', ic('<circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/>')],
    ['tesis', 'Tesis', ic('<path d="M6 3h9l4 4v14H6z"/><path d="M9 14l2 2 4-4"/>')],
    ['calculadora', 'Calculadora', ic('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h1M12 12h1M16 12h0M8 16h1M12 16h1"/>')],
    ['movimientos', 'Movimientos', ic('<path d="M4 8h14l-3-3M20 16H6l3 3"/>')],
    ['noticias', 'Noticias', ic('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>')],
    ['guia', 'Mi guía', ic('<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h11"/>')],
    ['glosario', 'Glosario', ic('<path d="M5 5h14M5 10h14M5 15h9M5 20h6"/>')],
    ['ajustes', 'Ajustes', ic('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>')],
  ];
  App.NAV = NAV;

  /* Mini-markdown: viñetas, listas numeradas, **negritas** y párrafos. */
  App.mdLite = (txt) => {
    const lines = String(txt || '').split('\n');
    let html = '', mode = null;
    const close = () => { if (mode) html += `</${mode}>`; mode = null; };
    const inline = (s) => App.esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    lines.forEach((ln) => {
      let m;
      if ((m = ln.match(/^\s*-\s+(.*)/))) { if (mode !== 'ul') { close(); html += '<ul>'; mode = 'ul'; } html += `<li>${inline(m[1])}</li>`; }
      else if ((m = ln.match(/^\s*\d+\.\s+(.*)/))) { if (mode !== 'ol') { close(); html += '<ol>'; mode = 'ol'; } html += `<li>${inline(m[1])}</li>`; }
      else if (ln.trim()) { close(); html += `<p>${inline(ln)}</p>`; }
      else close();
    });
    close();
    return html;
  };

  App.go = (view, arg) => { location.hash = '#/' + view + (arg ? '/' + encodeURIComponent(arg) : ''); };

  App.applyTheme = () => {
    const t = App.Store.state.settings.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  };

  function route() {
    const [, view = 'portafolio', arg] = location.hash.split('/');
    const v = App.views[view] || App.views.portafolio;
    const name = App.views[view] ? view : 'portafolio';
    App.current = { name, arg: arg ? decodeURIComponent(arg) : null };
    App.$$('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.v === name));
    App.$('#title').textContent = v.title;
    App.renderTop();
    const main = App.$('#main');
    main.scrollTop = 0;
    v.render(main, App.current.arg);
  }
  App.refresh = () => { const v = App.views[App.current.name]; const main = App.$('#main'); const st = main.scrollTop; v.render(main, App.current.arg); main.scrollTop = st; App.renderTop(); };

  App.renderTop = () => {
    const s = App.Store.state.settings;
    App.$('#top-actions').innerHTML = `
      <span class="fxpill" title="Tipo de cambio que usa la app (Ajustes)">1 USD = ${App.mxn(s.fx, 2)}</span>
      <div class="seg" role="group" aria-label="Divisa">
        <button data-cur="MXN" class="${s.display === 'MXN' ? 'on' : ''}">MXN</button>
        <button data-cur="USD" class="${s.display === 'USD' ? 'on' : ''}">USD</button></div>`;
    App.$$('[data-cur]').forEach((b) => (b.onclick = () => { App.Store.set((st) => (st.settings.display = b.dataset.cur)); App.refresh(); }));
  };

  async function boot() {
    await App.Store.init();
    App.applyTheme();
    App.$('#nav').innerHTML = NAV.map(([k, l, i]) => `<a href="#/${k}" data-v="${k}">${i}<span>${l}</span></a>`).join('');
    const who = App.Store.state.settings.name;
    App.$('#who').textContent = who ? `Hola, ${who}` : 'Mi portafolio';
    App.$('#storage').textContent = 'Datos: ' + App.Store.adapter.name;
    window.addEventListener('hashchange', route);
    route();
  }
  document.addEventListener('DOMContentLoaded', boot);
})(window);
