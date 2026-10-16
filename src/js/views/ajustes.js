/* Vista: Ajustes (divisa, claves API, topes, mezcla objetivo, respaldo, datos de ejemplo). */
(function (g) {
  const App = g.App;
  const { esc } = App;

  App.views.ajustes = {
    title: 'Ajustes',
    render(el) {
      const st = App.Store.state, s = st.settings;
      el.innerHTML = `
      <div class="grid2">
        <div class="card"><h3>General</h3>
          ${App.field('Tu nombre', `<input id="a-name" value="${esc(s.name)}">`)}
          <div class="grid2">
            ${App.field('Mostrar montos en', `<select id="a-disp">${App.options(['MXN', 'USD'], s.display)}</select>`)}
            ${App.field('Tema', `<select id="a-theme">${App.options([{ v: 'auto', l: 'Automático' }, { v: 'light', l: 'Claro' }, { v: 'dark', l: 'Oscuro' }], s.theme)}</select>`)}</div>
          <div class="row gap end">${App.field('Tipo de cambio (MXN por 1 USD)', `<input id="a-fx" type="number" step="0.01" value="${s.fx}">`, s.fxUpdated ? 'Actualizado: ' + new Date(s.fxUpdated).toLocaleString('es-MX') : 'Escríbelo o tráelo de la API.')}<button class="btn" id="a-fxget">↻ Traer</button></div></div>

        <div class="card"><h3>Claves de API</h3>
          ${App.field('Financial Modeling Prep', `<input id="a-fmp" type="password" value="${esc(s.fmpKey)}" autocomplete="off">`, 'site.financialmodelingprep.com — precios, noticias, Treasury, Brent.')}
          ${App.field('Alpha Vantage', `<input id="a-av" type="password" value="${esc(s.avKey)}" autocomplete="off" placeholder="Pega tu clave aquí">`, 'alphavantage.co/support/#api-key — noticias con sentimiento y respaldo de precios.')}
          <label class="check"><input type="checkbox" id="a-show"><span>Mostrar claves</span></label>
          <p class="muted sm">Las claves se guardan solo en tu computadora, junto con tus datos.</p></div>

        <div class="card"><h3>Mis topes (de tu guía)</h3><div class="grid2">
          ${App.field('Tope por posición (%)', `<input id="a-pos" type="number" value="${s.caps.position}">`)}
          ${App.field('Tope por sector (%)', `<input id="a-sec" type="number" value="${s.caps.sector}">`)}
          ${App.field('Efectivo mínimo (%)', `<input id="a-cmin" type="number" value="${s.caps.cashMin}">`)}
          ${App.field('Efectivo máximo (%)', `<input id="a-cmax" type="number" value="${s.caps.cashMax}">`)}
          ${App.field('Treasury 10 años: señal bajo (%)', `<input id="a-t10" type="number" step="0.01" value="${s.macro.treasury}">`)}
          ${App.field('Petróleo Brent: señal bajo (USD)', `<input id="a-brent" type="number" step="0.01" value="${s.macro.brent}">`)}
          ${App.field('% de tecnología dentro del ETF base (estimado)', `<input id="a-voo" type="number" value="${s.vooTechPct}">`, 'Para estimar tu exposición real a tecnología. Ajústalo con el dato más reciente del ETF.')}</div></div>

        <div class="card"><h3>Mezcla objetivo por bloque</h3>
          <table class="tbl compact"><thead><tr><th>Bloque</th><th class="r">Mín %</th><th class="r">Máx %</th><th class="r">Ejemplo %</th></tr></thead>
          <tbody>${s.targets.map((t, i) => `<tr><td>${esc(t.block)}</td>${['min', 'max', 'ex'].map((k) => `<td class="r"><input class="mini-in" data-t="${i}:${k}" type="number" value="${t[k] ?? ''}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
      </div>

      <div class="card"><h3>Datos y respaldo</h3>
        <p class="muted">Guardado en: <b>${esc(App.Store.adapter.name)}</b>. Haz un respaldo de vez en cuando.</p>
        <div class="row gap wrap">
          <button class="btn" id="a-exp">Descargar respaldo (JSON)</button>
          <label class="btn">Restaurar respaldo<input type="file" id="a-imp" accept=".json,application/json" hidden></label>
          <button class="btn" id="a-demo">Cargar datos de ejemplo</button>
          <button class="btn danger" id="a-reset">Borrar todo y empezar de cero</button></div></div>

      <div class="card"><h3>Acerca de</h3><p class="muted">Mis Inversiones · hecho a partir de “Mi guía de inversión” (11 oct 2026). Material educativo con reglas propias; no es asesoría financiera. Verifica cifras y fechas antes de actuar.</p></div>`;

      const $ = (id) => App.$(id, el);
      const num = (id) => Number($(id).value);
      const save = () => {
        App.Store.set((x) => {
          const c = x.settings;
          c.name = $('#a-name').value; c.display = $('#a-disp').value; c.theme = $('#a-theme').value; c.fx = num('#a-fx') || c.fx;
          c.fmpKey = $('#a-fmp').value.trim(); c.avKey = $('#a-av').value.trim();
          c.caps = { position: num('#a-pos'), sector: num('#a-sec'), cashMin: num('#a-cmin'), cashMax: num('#a-cmax') };
          c.macro = { treasury: num('#a-t10'), brent: num('#a-brent') }; c.vooTechPct = num('#a-voo');
        });
        App.applyTheme(); App.$('#who').textContent = App.Store.state.settings.name ? `Hola, ${App.Store.state.settings.name}` : 'Mi portafolio'; App.renderTop();
      };
      App.$$('input:not([type=file]):not(#a-show):not([data-t]),select', el).forEach((i) => i.addEventListener('change', save));
      App.$$('[data-t]', el).forEach((i) => (i.onchange = () => { const [n, k] = i.dataset.t.split(':'); App.Store.set((x) => (x.settings.targets[Number(n)][k] = i.value === '' ? null : Number(i.value))); }));
      $('#a-show').onchange = (e) => { $('#a-fmp').type = e.target.checked ? 'text' : 'password'; $('#a-av').type = e.target.checked ? 'text' : 'password'; };
      $('#a-fxget').onclick = async (e) => {
        save(); e.target.disabled = true;
        try { const fx = await App.API.usdmxn(); App.Store.set((x) => { x.settings.fx = Number(fx.toFixed(4)); x.settings.fxUpdated = new Date().toISOString(); }); App.toast(`Tipo de cambio: ${fx.toFixed(2)}`, 'ok'); App.refresh(); }
        catch (err) { App.toast(err.message, 'bad'); e.target.disabled = false; }
      };
      $('#a-exp').onclick = () => App.download(`mis-inversiones-respaldo-${App.today()}.json`, JSON.stringify(App.Store.state, null, 2));
      $('#a-imp').onchange = (e) => {
        const f = e.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => { try { const d = JSON.parse(r.result); if (!d.movements || !d.settings) throw new Error('Formato no válido'); App.confirm('Esto reemplaza TODOS tus datos actuales por los del respaldo.', () => { App.Store.replace(d); App.applyTheme(); App.toast('Respaldo restaurado', 'ok'); App.refresh(); }, 'Restaurar'); } catch (err) { App.toast('Archivo no válido: ' + err.message, 'bad'); } };
        r.readAsText(f);
      };
      $('#a-demo').onclick = () => { App.loadDemo(); App.toast('Datos de ejemplo cargados', 'ok'); App.go('portafolio'); };
      $('#a-reset').onclick = () => App.confirm('Se borra TODO (movimientos, tesis, plan, ajustes). No se puede deshacer; descarga un respaldo antes.', () => { const keep = { fmpKey: st.settings.fmpKey, avKey: st.settings.avKey }; App.Store.replace(App.defaultState()); App.Store.set((x) => Object.assign(x.settings, keep)); App.applyTheme(); App.toast('Listo, empezamos de cero', 'ok'); App.go('portafolio'); }, 'Borrar todo');
    },
  };
})(window);
