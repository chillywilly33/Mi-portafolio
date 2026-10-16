/* Vista: Portafolio (diversificación, gráficas, alertas de reglas, posiciones). */
(function (g) {
  const App = g.App;
  const { esc } = App;

  /** Editar los datos de un valor (nombre, sector, tipo, precio). */
  App.editSecurity = (ticker, done) => {
    const sec = App.Store.state.securities[ticker] || { ticker, name: ticker, sector: 'Otro', type: 'stock', price: null };
    App.modal({
      title: `Datos de ${ticker}`,
      body: `<div class="grid2">
        ${App.field('Nombre', `<input id="e-name" value="${esc(sec.name)}">`)}
        ${App.field('Sector / bloque', `<select id="e-sector">${App.options(App.SECTORS, sec.sector)}</select>`, 'El ETF base no cuenta para el tope individual.')}
        ${App.field('Tipo', `<select id="e-type">${App.options([{ v: 'stock', l: 'Acción' }, { v: 'etf', l: 'ETF' }, { v: 'crypto', l: 'Cripto' }], sec.type)}</select>`)}
        ${App.field('Precio actual (USD)', `<input id="e-price" type="number" step="any" value="${sec.price ?? ''}">`, 'Puedes escribirlo a mano o usar “Actualizar precios”.')}</div>`,
      actions: [{ label: 'Cancelar' }, { label: 'Guardar', primary: true, onClick: (close, ov) => {
        const v = (id) => App.$(id, ov).value;
        App.Store.set((s) => {
          s.securities[ticker] = { ...sec, ticker, name: v('#e-name') || ticker, sector: v('#e-sector'), type: v('#e-type'), price: v('#e-price') === '' ? null : Number(v('#e-price')), priceUpdated: new Date().toISOString() };
          if (s.theses[ticker]) s.theses[ticker].sector = v('#e-sector');
        });
        done && done();
      } }],
    });
  };

  App.refreshPricesUI = async (btn) => {
    const sum = Calc.summarize(App.Store.state);
    const tickers = Array.from(new Set([...sum.rows.map((r) => r.ticker)]));
    if (!tickers.length) return App.toast('Aún no tienes posiciones para actualizar', 'info');
    if (btn) { btn.disabled = true; btn.textContent = 'Actualizando…'; }
    try {
      const r = await App.API.refreshPrices(tickers);
      App.toast(`Precios actualizados: ${r.ok.length}${r.fail.length ? ' · fallaron ' + r.fail.length : ''}`, r.fail.length ? 'bad' : 'ok');
      if (r.fail.length) App.modal({ title: 'Algunos precios no se pudieron obtener', body: `<ul class="plain">${r.fail.map((f) => `<li>${esc(f)}</li>`).join('')}</ul><p class="muted">Puedes escribir el precio a mano en la tabla.</p>` });
    } catch (e) { App.toast(e.message, 'bad'); }
    App.refresh();
  };

  function kpi(label, value, sub, cls) {
    return `<div class="kpi"><span>${label}</span><b class="${cls || ''}">${value}</b><small>${sub || ''}</small></div>`;
  }

  App.views.portafolio = {
    title: 'Portafolio',
    render(el) {
      const st = App.Store.state;
      const sum = Calc.summarize(st);
      const alerts = Calc.checkRules(sum, st.settings, st.theses);
      const empty = !sum.rows.length && sum.cash <= 0;

      const acts = `<div class="row gap wrap">
        <button class="btn" id="b-px">↻ Actualizar precios</button>
        <button class="btn primary" id="b-mov">+ Movimiento</button></div>`;

      if (empty) {
        el.innerHTML = `<div class="card hero-empty">
          <h2>Empieza registrando tus movimientos</h2>
          <p>El portafolio se calcula solo a partir de tus <b>movimientos</b> (depósitos, compras, ventas y dividendos). Registra tu primer depósito y tus compras, o carga datos de ejemplo para ver cómo luce todo.</p>
          <div class="row gap wrap"><button class="btn primary" id="b-mov">+ Registrar movimiento</button><button class="btn" id="b-demo">Cargar datos de ejemplo</button>
          <button class="btn ghost" id="b-guide">Leer mi guía</button></div></div>`;
        App.$('#b-mov').onclick = () => App.openMovement();
        App.$('#b-demo').onclick = () => { App.loadDemo(); App.refresh(); };
        App.$('#b-guide').onclick = () => App.go('guia');
        return;
      }

      const gainCls = sum.gain >= 0 ? 'pos' : 'neg';
      const cashPct = sum.total ? (Math.max(sum.cash, 0) / sum.total) * 100 : 0;
      const sorted = sum.rows;
      const pieItems = [...sorted.map((r) => ({ label: r.ticker, value: r.value })), ...(sum.cash > 0 ? [{ label: 'Efectivo', value: sum.cash, color: '#9aa5b1' }] : [])];
      const blockItems = Object.entries(sum.blocks).map(([k, v]) => ({ label: k, value: v, color: k === 'Efectivo' ? '#9aa5b1' : undefined }));
      const tg = st.settings.targets;
      const rangeRows = tg.map((t) => ({ label: t.block, actual: sum.blockPct[t.block] || 0, min: t.min, max: t.max, target: t.ex }));
      Object.keys(sum.blockPct).forEach((k) => { if (!tg.find((t) => t.block === k)) rangeRows.push({ label: k, actual: sum.blockPct[k] }); });

      const sema = App.semaforo ? App.semaforo() : null;
      const upcoming = [...st.reports].filter((r) => App.daysUntil(r.date) >= 0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);

      el.innerHTML = `
      ${st.demo ? `<div class="banner">Estás viendo <b>datos de ejemplo</b> (ficticios). <button class="btn sm" id="b-clear">Borrar ejemplo y empezar</button></div>` : ''}
      <div class="row between wrap gap"><div></div>${acts}</div>
      <div class="kpis">
        ${kpi('Valor del portafolio', App.money(sum.total), App.display() === 'MXN' ? App.usd(sum.total, 2) : App.mxn(sum.total * sum.fx, 0))}
        ${kpi('Invertido (costo)', App.money(sum.cost), `${sum.rows.length} posiciones`)}
        ${kpi('Ganancia no realizada', App.money(sum.gain), App.signed(sum.gainPct, 2) + ' en USD', gainCls)}
        ${kpi('Ganancia en pesos', App.mxn(sum.gainMXN, 0), 'incluye efecto del tipo de cambio', sum.gainMXN >= 0 ? 'pos' : 'neg')}
        ${kpi('Efectivo', App.money(Math.max(sum.cash, 0)), App.pct(cashPct) + ' del portafolio')}
      </div>

      <div class="grid3">
        <div class="card"><h3>Alertas de mis reglas</h3><ul class="alerts">${alerts.map((a) => `<li class="${a.level}">${esc(a.text)}</li>`).join('')}</ul></div>
        <div class="card"><h3>Diversificación</h3>
          <div class="stat-line"><span>Posiciones efectivas</span><b>${sum.effective.toFixed(1)} <small>de ${sum.rows.length + (sum.cash > 0 ? 1 : 0)}</small></b></div>
          <div class="stat-line"><span>Mayor posición</span><b>${sorted[0] ? `${sorted[0].ticker} ${sorted[0].weight.toFixed(1)}%` : '—'}</b></div>
          <div class="stat-line"><span>Tecnología directa</span><b>${App.pct(sum.techDirect)}</b></div>
          <div class="stat-line"><span title="Tecnología directa + parte tecnológica estimada del ETF (Ajustes)">Tecnología real (con ETF)</span><b>${App.pct(sum.techReal)}</b></div>
          <p class="muted sm">“Posiciones efectivas” mide cuántas posiciones iguales darían la misma concentración. Si está muy por debajo del número real, hay peso concentrado.</p></div>
        <div class="card"><h3>Semáforo macro</h3>${sema ? `<div class="sema-mini">${sema.items.map((i) => `<div class="dot ${i.c}" title="${esc(i.t)}"></div>`).join('')}<b>${sema.greens} de ${sema.items.length}</b></div><p class="sm">${esc(sema.msg)}</p>` : ''}
          <h3 class="mt">Próximos reportes</h3>
          ${upcoming.length ? upcoming.map((r) => `<div class="stat-line"><span>${esc(r.ticker)}</span><b>${App.fmtDate(r.date)} <small>en ${App.daysUntil(r.date)} d</small></b></div>`).join('') : '<p class="muted sm">Sin reportes próximos. Agrégalos en “Mi guía”.</p>'}</div>
      </div>

      <div class="grid2">
        <div class="card"><h3>Por posición</h3>${App.donut(pieItems, { center: App.money(sum.total), sub: 'total', label: 'Distribución por posición' })}</div>
        <div class="card"><h3>Por sector / bloque</h3>${App.donut(blockItems, { center: String(Object.keys(sum.blocks).length), sub: 'bloques', label: 'Distribución por sector' })}</div>
      </div>
      <div class="card"><h3>Hoy vs. mi mezcla objetivo</h3>${App.rangeBars(rangeRows)}</div>

      <div class="card"><div class="row between"><h3>Posiciones</h3><small class="muted">Haz clic en el precio para editarlo · clic en el ticker para ver su tesis</small></div>
      <div class="tablewrap"><table class="tbl">
        <thead><tr><th>Valor</th><th>Sector</th><th class="r">Cantidad</th><th class="r">Costo prom.</th><th class="r">Precio</th><th class="r">Valor</th><th class="r">Peso</th><th class="r">Ganancia</th><th></th></tr></thead>
        <tbody>${sorted.map((r) => {
          const over = r.sector !== 'ETF base' && r.weight > st.settings.caps.position;
          return `<tr>
          <td><a class="tk" href="#/tesis/${encodeURIComponent(r.ticker)}">${esc(r.ticker)}</a><small class="muted block">${esc(r.name)}</small></td>
          <td><span class="chip">${esc(r.sector)}</span></td>
          <td class="r">${App.num(r.qty, 4)}</td>
          <td class="r">${App.usd(r.avg)}</td>
          <td class="r"><button class="linkbtn" data-px="${esc(r.ticker)}" title="${r.hasPrice ? 'Editar precio' : 'Sin precio: usando costo promedio'}">${r.hasPrice ? App.usd(r.price) : '<i class="muted">sin precio</i>'}</button></td>
          <td class="r">${App.money(r.value)}</td>
          <td class="r ${over ? 'neg' : ''}"><b>${r.weight.toFixed(1)}%</b><div class="mini"><i style="width:${Math.min(100, r.weight)}%"></i></div></td>
          <td class="r ${r.gain >= 0 ? 'pos' : 'neg'}">${App.signed(r.gainPct, 1)}<small class="block">${App.money(r.gain)}</small></td>
          <td class="r"><button class="icon-btn" data-ed="${esc(r.ticker)}" title="Editar datos">✎</button></td></tr>`;
        }).join('')}
        ${sum.cash > 0 ? `<tr><td><b>Efectivo</b></td><td><span class="chip">Efectivo</span></td><td></td><td></td><td></td><td class="r">${App.money(sum.cash)}</td><td class="r"><b>${cashPct.toFixed(1)}%</b></td><td></td><td></td></tr>` : ''}
        </tbody></table></div></div>`;

      const pxBtn = App.$('#b-px'); pxBtn.onclick = () => App.refreshPricesUI(pxBtn);
      App.$('#b-mov').onclick = () => App.openMovement();
      const clr = App.$('#b-clear'); if (clr) clr.onclick = () => App.confirm('Se borrarán los movimientos de ejemplo.', () => { App.clearDemo(); App.refresh(); }, 'Borrar ejemplo');
      App.$$('[data-px],[data-ed]', el).forEach((b) => (b.onclick = () => App.editSecurity(b.dataset.px || b.dataset.ed, App.refresh)));
    },
  };

  App.loadDemo = () => {
    const d = App.demoData();
    App.Store.set((s) => {
      s.movements = s.movements.concat(d.movements);
      Object.entries(d.prices).forEach(([t, p]) => { s.securities[t] = { ...(s.securities[t] || {}), ticker: t, price: p, priceUpdated: new Date().toISOString() }; });
      s.demo = true;
    });
  };
  App.clearDemo = () => {
    App.Store.set((s) => {
      s.movements = s.movements.filter((m) => !m.demo);
      ['VOO', 'META', 'GOOGL', 'SPOT', 'NVDA', 'AXP'].forEach((t) => { if (s.securities[t]) { s.securities[t].price = null; s.securities[t].priceUpdated = null; } });
      s.demo = false;
    });
  };
})(window);
