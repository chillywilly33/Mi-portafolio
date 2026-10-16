/* Vista: Tesis (4 preguntas + filtro de 15 + reglas de venta por empresa). */
(function (g) {
  const App = g.App;
  const { esc } = App;
  let statusFilter = '';

  App.views.tesis = {
    title: 'Tesis de inversión',
    render(el, arg) {
      const st = App.Store.state;
      const keys = Object.keys(st.theses);
      let sel = arg && st.theses[arg] ? arg : (App.views.tesis.last && st.theses[App.views.tesis.last] ? App.views.tesis.last : keys[0]);
      App.views.tesis.last = sel;
      const order = ['comprada_tesis', 'comprada_antes', 'analizada', 'radar', 'descartada', 'fuera'];
      const sum = Calc.summarize(st);

      const listHTML = order.map((s) => {
        const items = keys.filter((k) => st.theses[k].status === s && (!statusFilter || statusFilter === s));
        if (!items.length) return '';
        return `<div class="grp"><h4>${App.STATUS[s].l} <small>${items.length}</small></h4>${items.map((k) => {
          const t = st.theses[k], sc = Calc.score(t.filters);
          const badge = sc.answered === 15 ? `${sc.passes}/5` : (t.priorScore != null ? `${t.priorScore}/5*` : '—');
          return `<a href="#/tesis/${encodeURIComponent(k)}" class="li ${k === sel ? 'on' : ''}"><span><b>${esc(k)}</b> <small>${esc(t.name)}</small></span><em class="b-${sc.level === 'none' && t.priorScore != null ? (t.priorScore >= 5 ? 'high' : t.priorScore >= 3 ? 'mid' : 'low') : sc.level}">${badge}</em></a>`;
        }).join('')}</div>`;
      }).join('');

      el.innerHTML = `<div class="split">
        <div class="card list">
          <div class="row between"><select id="t-filter"><option value="">Todas</option>${App.options(order.map((v) => ({ v, l: App.STATUS[v].l })), statusFilter)}</select>
          <button class="btn sm primary" id="t-new">+ Empresa</button></div>
          ${listHTML || '<div class="empty small">Sin empresas</div>'}
          <p class="muted sm">* resultado anotado en tu guía; responde las 15 preguntas para recalcularlo.</p></div>
        <div id="t-detail"></div></div>`;

      App.$('#t-filter').onchange = (e) => { statusFilter = e.target.value; App.refresh(); };
      App.$('#t-new').onclick = () => newCompany();
      if (sel) detail(App.$('#t-detail'), sel, sum);
      else App.$('#t-detail').innerHTML = '<div class="card empty">Agrega tu primera empresa.</div>';
    },
  };

  function newCompany() {
    App.modal({
      title: 'Nueva empresa',
      body: `<div class="grid2">${App.field('Ticker', '<input id="n-t" placeholder="MSFT" autocapitalize="characters">')}
        ${App.field('Nombre', '<input id="n-n" placeholder="Microsoft">')}
        ${App.field('Sector', `<select id="n-s">${App.options(App.SECTORS, 'Tecnología')}</select>`)}
        ${App.field('Estado', `<select id="n-st">${App.options(Object.entries(App.STATUS).map(([v, o]) => ({ v, l: o.l })), 'analizada')}</select>`)}</div>`,
      actions: [{ label: 'Cancelar' }, { label: 'Crear', primary: true, onClick: (c, ov) => {
        const t = App.$('#n-t', ov).value.trim().toUpperCase();
        if (!t) { App.toast('Escribe el ticker', 'bad'); return false; }
        if (App.Store.state.theses[t]) { App.toast('Esa empresa ya existe', 'bad'); return false; }
        App.Store.set((s) => {
          s.theses[t] = { name: App.$('#n-n', ov).value.trim() || t, status: App.$('#n-st', ov).value, sector: App.$('#n-s', ov).value, targetPct: null, conviction: '', q1: '', q2: '', q3: '', q4: '', filters: Array(15).fill(null), priorScore: null, sellRules: '', watch: '', buyPlan: '', notes: '', nextReport: '' };
          if (!s.securities[t]) s.securities[t] = { ticker: t, name: App.$('#n-n', ov).value.trim() || t, sector: App.$('#n-s', ov).value, type: 'stock', price: null, priceUpdated: null };
        });
        App.go('tesis', t);
      } }],
    });
  }

  function detail(box, tk, sum) {
    const st = App.Store.state;
    const t = st.theses[tk];
    const pos = sum.rows.find((r) => r.ticker === tk);
    const upd = (fn) => App.Store.set((s) => fn(s.theses[tk]));
    const reports = st.reports.filter((r) => r.ticker === tk).sort((a, b) => a.date.localeCompare(b.date));

    box.innerHTML = `
    <div class="card">
      <div class="row between wrap gap">
        <div><h2 class="h-co">${esc(tk)} <small>${esc(t.name)}</small></h2>
          <span class="chip st-${App.STATUS[t.status].c}">${App.STATUS[t.status].l}</span>
          ${pos ? `<span class="chip">Tengo ${pos.weight.toFixed(1)}% · ${App.money(pos.value)}</span>` : '<span class="chip muted">Sin posición</span>'}
          ${reports[0] ? `<span class="chip">Reporte: ${App.fmtDate(reports[0].date)}</span>` : ''}</div>
        <div class="row gap wrap">
          <button class="btn" id="t-calc">Calcular compra</button>
          <button class="btn" id="t-buy">Registrar compra</button>
          <button class="btn ghost" id="t-del">Eliminar</button></div></div>
      <div class="grid4 mt">
        ${App.field('Estado', `<select id="f-status">${App.options(Object.entries(App.STATUS).map(([v, o]) => ({ v, l: o.l })), t.status)}</select>`)}
        ${App.field('Sector', `<select id="f-sector">${App.options(App.SECTORS, t.sector)}</select>`)}
        ${App.field('Convicción', `<select id="f-conv">${App.options([{ v: '', l: '—' }, { v: 'alta', l: 'Alta (hasta 8%)' }, { v: 'normal', l: 'Normal (3-6%)' }, { v: 'chica', l: 'Chica / especulativa (2-3%)' }], t.conviction)}</select>`)}
        ${App.field('% objetivo del portafolio', `<input id="f-pct" type="number" step="any" min="0" max="100" value="${t.targetPct ?? ''}">`)}
      </div>
    </div>

    <div class="card"><h3>Las 4 preguntas</h3>
      <div class="grid2">${App.Q4.map((q) => `<label class="field"><span>${q.t}</span><textarea data-q="${q.k}" rows="3">${esc(t[q.k])}</textarea><small>${q.h}</small></label>`).join('')}</div></div>

    <div class="card"><div class="row between wrap"><h3>El filtro de 15 preguntas</h3><small class="muted">Un filtro solo pasa con 3 “sí”.</small></div>
      <div id="score"></div><div class="filters" id="filters"></div></div>

    <div class="grid2">
      <div class="card"><h3>Mis reglas de venta</h3><textarea id="f-sell" rows="5" placeholder="Vendo una parte (20-30%) si… / vendo todo si se juntan 2 de…">${esc(t.sellRules)}</textarea>
        <p class="muted sm">Escríbelas antes de comprar. Recuerda: ganancia o caída de un día NO son razón.</p></div>
      <div class="card"><h3>Plan de compra</h3><textarea id="f-buy" rows="5" placeholder="% objetivo, número de compras y condición de cada una…">${esc(t.buyPlan)}</textarea></div>
      <div class="card"><h3>Qué vigilar</h3><textarea id="f-watch" rows="4">${esc(t.watch)}</textarea></div>
      <div class="card"><h3>Notas</h3><textarea id="f-notes" rows="4">${esc(t.notes)}</textarea></div>
    </div>`;

    const renderFilters = () => {
      const sc = Calc.score(t.filters);
      App.$('#score').innerHTML = `<div class="scorebar lvl-${sc.level}"><div class="big">${sc.answered === 15 ? sc.passes : (t.priorScore != null && !sc.answered ? t.priorScore : sc.passes)}<small>/5</small></div>
        <div><b>${sc.answered === 15 ? esc(sc.label) : (t.priorScore != null && !sc.answered ? 'Resultado anotado en tu guía' : 'En progreso')}</b>
        <p>${sc.answered === 15 ? esc(sc.advice) : (t.priorScore != null && !sc.answered ? `Tu guía registra ${t.priorScore} de 5. Responde las preguntas para ver el detalle.` : esc(sc.advice))}</p></div>
        <div class="pips">${sc.per.map((p, i) => `<i class="${p.pass ? 'y' : p.complete ? 'n' : ''}" title="${App.FILTERS[i].n}"></i>`).join('')}</div></div>`;
      App.$('#filters').innerHTML = App.FILTERS.map((f, k) => {
        const p = sc.per[k];
        return `<div class="filt ${p.pass ? 'pass' : p.complete ? 'fail' : ''}"><h4>${k + 1}. ${f.n} <em>${p.yes}/3</em></h4>
          ${f.q.map((q, j) => {
            const idx = k * 3 + j, v = t.filters[idx];
            return `<div class="qrow"><span>${q}</span><div class="tri" data-i="${idx}">
              <button data-v="1" class="${v === true ? 'on y' : ''}">Sí</button><button data-v="0" class="${v === false ? 'on n' : ''}">No</button><button data-v="-" class="${v == null ? 'on' : ''}" title="Sin responder">–</button></div></div>`;
          }).join('')}</div>`;
      }).join('');
      App.$$('.tri button', box).forEach((b) => (b.onclick = () => {
        const i = Number(b.parentNode.dataset.i), v = b.dataset.v;
        upd((o) => (o.filters[i] = v === '1' ? true : v === '0' ? false : null));
        renderFilters();
        const li = App.$(`.list a.on em`); // actualizar insignia de la lista
        if (li) { const s2 = Calc.score(t.filters); li.textContent = s2.answered === 15 ? s2.passes + '/5' : (t.priorScore != null ? t.priorScore + '/5*' : '—'); }
      }));
    };
    renderFilters();

    const bind = (id, key, num) => { const e = App.$(id, box); e.oninput = () => upd((o) => (o[key] = num ? (e.value === '' ? null : Number(e.value)) : e.value)); return e; };
    bind('#f-sell', 'sellRules'); bind('#f-buy', 'buyPlan'); bind('#f-watch', 'watch'); bind('#f-notes', 'notes');
    bind('#f-conv', 'conviction'); bind('#f-pct', 'targetPct', true);
    App.$$('[data-q]', box).forEach((e) => (e.oninput = () => upd((o) => (o[e.dataset.q] = e.value))));
    App.$('#f-status').onchange = (e) => { upd((o) => (o.status = e.target.value)); App.refresh(); };
    App.$('#f-sector').onchange = (e) => { App.Store.set((s) => { s.theses[tk].sector = e.target.value; if (s.securities[tk]) s.securities[tk].sector = e.target.value; }); App.toast('Sector actualizado', 'ok'); };
    App.$('#t-calc').onclick = () => App.go('calculadora', tk);
    App.$('#t-buy').onclick = () => App.openMovement({ type: 'compra', ticker: tk, sellRules: t.sellRules });
    App.$('#t-del').onclick = () => App.confirm(`¿Eliminar la tesis de ${tk}? (No borra tus movimientos.)`, () => { App.Store.set((s) => delete s.theses[tk]); App.views.tesis.last = null; App.go('tesis'); App.refresh(); }, 'Eliminar');
  }
})(window);
