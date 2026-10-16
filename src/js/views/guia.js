/* Vista: Mi guía — todo tu método: principios, semáforo macro, calendario, checklists, mapa de empresas. */
(function (g) {
  const App = g.App;
  const { esc } = App;

  /** Evalúa el semáforo macro (4 condiciones de tu guía). */
  App.semaforo = () => {
    const st = App.Store.state, m = st.macro, th = st.settings.macro;
    const items = [
      { t: `Treasury 10 años ${m.treasury != null ? m.treasury.toFixed(2) + '%' : '—'} (señal: baja de ~${th.treasury}%)`, c: m.treasury == null ? 'n' : m.treasury < th.treasury ? 'g' : 'r' },
      { t: `Petróleo Brent ${m.brent != null ? '$' + m.brent : '—'} (señal: baja de ~$${th.brent})`, c: m.brent == null ? 'n' : m.brent < th.brent ? 'g' : 'r' },
      { t: `Tono de la Fed: ${{ sube: 'ciclo de alzas', pausa: 'pausa / incierto', baja: 'recortes' }[m.fed] || '—'}`, c: m.fed === 'baja' ? 'g' : m.fed === 'pausa' ? 'y' : 'r' },
      { t: 'Una acción de calidad cayó 15-20% sin deterioro del negocio', c: m.quality ? 'g' : 'r' },
    ];
    const greens = items.filter((i) => i.c === 'g').length;
    const msg = greens >= 3 ? 'Varias señales a favor: revisa tu lista y compra escalonado (un solo día verde no cuenta; que se sostengan 3-5 días).'
      : greens === 0 ? 'Todo en rojo: sigo esperando señales sostenidas, no persigo rebotes.' : `${greens} de ${items.length} señales a favor. Un solo día verde no cuenta: espero que se sostengan.`;
    return { items, greens, msg };
  };

  let editing = null, tab = 'todo';

  App.views.guia = {
    title: 'Mi guía',
    render(el) {
      const st = App.Store.state;
      const tabs = [['todo', 'Mi método'], ['semaforo', 'Semáforo y calendario'], ['check', 'Checklists'], ['mapa', 'Mapa de empresas'], ['diario', 'Diario']];
      el.innerHTML = `<div class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="tabbody"></div>`;
      App.$$('[data-tab]', el).forEach((b) => (b.onclick = () => { tab = b.dataset.tab; App.refresh(); }));
      const body = App.$('#tabbody', el);
      ({ todo: tabTodo, semaforo: tabSema, check: tabCheck, mapa: tabMapa, diario: tabDiario })[tab](body, st);
    },
  };

  /* ---- Mi método (secciones editables) ---- */
  function tabTodo(body, st) {
    body.innerHTML = `<p class="muted">Tu guía de inversión, actualizada al 11 de octubre de 2026. Cada sección se puede editar con ✎ (escribe una viñeta por línea con “- ”).</p>
      <div class="guide">${st.guide.map((s, i) => `<section class="card gsec">
        <div class="row between"><h3>${esc(s.title)}</h3><button class="icon-btn" data-edit="${i}" title="Editar">${editing === i ? '✓' : '✎'}</button></div>
        ${editing === i ? `<textarea data-gt="${i}" rows="${Math.max(5, s.body.split('\n').length + 1)}">${esc(s.body)}</textarea><div class="row gap"><button class="btn sm primary" data-ok="${i}">Guardar</button></div>` : `<div class="md">${App.mdLite(s.body)}</div>`}</section>`).join('')}</div>
      <div class="row gap"><button class="btn" id="g-add">+ Agregar sección</button><button class="btn ghost" id="g-reset">Restaurar texto original de la guía</button></div>`;
    App.$$('[data-edit]', body).forEach((b) => (b.onclick = () => { editing = editing === Number(b.dataset.edit) ? null : Number(b.dataset.edit); App.refresh(); }));
    App.$$('[data-ok]', body).forEach((b) => (b.onclick = () => { const i = Number(b.dataset.ok); const v = App.$(`[data-gt="${i}"]`, body).value; App.Store.set((s) => (s.guide[i].body = v)); editing = null; App.refresh(); }));
    App.$('#g-add', body).onclick = () => App.modal({ title: 'Nueva sección', body: App.field('Título', '<input id="gs-t">'), actions: [{ label: 'Cancelar' }, { label: 'Agregar', primary: true, onClick: (c, ov) => { const t = App.$('#gs-t', ov).value.trim(); if (!t) return false; App.Store.set((s) => s.guide.push({ id: App.uid(), title: t, body: '- ' })); editing = App.Store.state.guide.length - 1; App.refresh(); } }] });
    App.$('#g-reset', body).onclick = () => App.confirm('Se reemplaza todo el texto de la guía por el original (pierdes tus ediciones).', () => { App.Store.set((s) => (s.guide = App.GUIDE_DEFAULT.map((x) => ({ ...x })))); App.refresh(); }, 'Restaurar');
  }

  /* ---- Semáforo + calendario ---- */
  function tabSema(body, st) {
    const m = st.macro, sema = App.semaforo();
    const reps = [...st.reports].sort((a, b) => a.date.localeCompare(b.date));
    body.innerHTML = `<div class="grid2">
      <div class="card"><div class="row between"><h3>Semáforo macro</h3><button class="btn sm" id="s-fetch">↻ Traer de la API</button></div>
        <div class="sema">${sema.items.map((i) => `<div class="srow"><div class="dot ${i.c}"></div><span>${esc(i.t)}</span></div>`).join('')}</div>
        <p class="sm"><b>${sema.greens} de 4</b> — ${esc(sema.msg)}</p>
        <div class="grid2">
          ${App.field('Treasury 10 años (%)', `<input id="s-tr" type="number" step="0.01" value="${m.treasury ?? ''}">`)}
          ${App.field('Petróleo Brent (USD)', `<input id="s-br" type="number" step="0.01" value="${m.brent ?? ''}">`)}
          ${App.field('Tono de la Fed', `<select id="s-fed">${App.options([{ v: 'sube', l: 'Ciclo de alzas / sube' }, { v: 'pausa', l: 'Pausa / incierto' }, { v: 'baja', l: 'Recortes' }], m.fed)}</select>`)}
          <label class="check pad"><input type="checkbox" id="s-q" ${m.quality ? 'checked' : ''}><span>Una acción de calidad cayó 15-20% sin deterioro</span></label></div>
        <p class="muted sm">Actualizado: ${esc(m.updated || '—')}. Los umbrales (4.75% y $95) se cambian en Ajustes.</p></div>
      <div class="card"><div class="row between"><h3>Calendario de reportes</h3><button class="btn sm" id="r-add">+ Reporte</button></div>
        <p class="muted sm">Fechas de octubre de 2026 según tu guía; verifícalas antes de actuar.</p>
        <div class="tablewrap"><table class="tbl compact"><tbody>${reps.map((r) => { const d = App.daysUntil(r.date); return `<tr class="${d < 0 ? 'past' : ''}"><td><b>${esc(r.ticker)}</b></td><td>${App.fmtDate(r.date)}${r.when ? `<small class="block muted">${esc(r.when)}</small>` : ''}</td><td>${d < 0 ? '<span class="chip">pasó</span>' : d === 0 ? '<span class="chip st-low">hoy</span>' : `<span class="chip ${d <= 7 ? 'st-mid' : ''}">en ${d} d</span>`}${r.confirmed ? '' : '<span class="chip">por confirmar</span>'}</td><td class="r"><button class="icon-btn" data-re="${r.id}">✎</button><button class="icon-btn" data-rd="${r.id}">🗑</button></td></tr>`; }).join('')}</tbody></table></div></div></div>`;

    const saveMacro = () => App.Store.set((s) => { s.macro = { ...s.macro, treasury: App.$('#s-tr', body).value === '' ? null : Number(App.$('#s-tr', body).value), brent: App.$('#s-br', body).value === '' ? null : Number(App.$('#s-br', body).value), fed: App.$('#s-fed', body).value, quality: App.$('#s-q', body).checked, updated: App.today() }; });
    ['#s-tr', '#s-br', '#s-fed', '#s-q'].forEach((id) => (App.$(id, body).onchange = () => { saveMacro(); App.refresh(); }));
    App.$('#s-fetch', body).onclick = async (e) => {
      e.target.disabled = true; e.target.textContent = 'Consultando…';
      try {
        const r = await App.API.macro();
        App.Store.set((s) => { Object.assign(s.macro, r.out, { updated: App.today() }); });
        App.toast(Object.keys(r.out).length ? 'Semáforo actualizado' : 'No se obtuvo ningún dato', Object.keys(r.out).length ? 'ok' : 'bad');
        if (r.errs.length) App.modal({ title: 'Avisos', body: `<ul class="plain">${r.errs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="muted">Puedes escribir los valores a mano.</p>` });
      } catch (err) { App.toast(err.message, 'bad'); }
      App.refresh();
    };
    const repForm = (r) => App.modal({
      title: r ? 'Editar reporte' : 'Nuevo reporte',
      body: `<div class="grid2">${App.field('Ticker', `<input id="rp-t" value="${esc(r ? r.ticker : '')}" autocapitalize="characters">`)}${App.field('Fecha', `<input id="rp-d" type="date" value="${r ? r.date : App.today()}">`)}${App.field('Momento', `<input id="rp-w" value="${esc(r ? r.when : '')}" placeholder="antes de la apertura / después del cierre">`)}<label class="check pad"><input id="rp-c" type="checkbox" ${!r || r.confirmed ? 'checked' : ''}><span>Fecha confirmada</span></label></div>`,
      actions: [{ label: 'Cancelar' }, { label: 'Guardar', primary: true, onClick: (c, ov) => { const t = App.$('#rp-t', ov).value.trim().toUpperCase(); if (!t) return false; const rec = { id: r ? r.id : App.uid(), ticker: t, date: App.$('#rp-d', ov).value, when: App.$('#rp-w', ov).value, note: r ? r.note : '', confirmed: App.$('#rp-c', ov).checked }; App.Store.set((s) => { if (r) s.reports[s.reports.findIndex((x) => x.id === r.id)] = rec; else s.reports.push(rec); }); App.refresh(); } }],
    });
    App.$('#r-add', body).onclick = () => repForm();
    App.$$('[data-re]', body).forEach((b) => (b.onclick = () => repForm(st.reports.find((x) => x.id === b.dataset.re))));
    App.$$('[data-rd]', body).forEach((b) => (b.onclick = () => { App.Store.set((s) => (s.reports = s.reports.filter((x) => x.id !== b.dataset.rd))); App.refresh(); }));
  }

  /* ---- Checklists ---- */
  function tabCheck(body, st) {
    const block = (key, title, list) => `<div class="card"><div class="row between"><h3>${title}</h3><button class="btn sm ghost" data-reset="${key}">Reiniciar</button></div>
      ${list.map((t, i) => `<label class="check"><input type="checkbox" data-ck="${key}:${i}" ${st.checks[key][i] ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}
      <p class="sm ${list.every((_, i) => st.checks[key][i]) ? 'pos' : 'muted'}">${list.filter((_, i) => st.checks[key][i]).length} de ${list.length} listos</p></div>`;
    body.innerHTML = `<div class="grid2">${block('before', 'Antes de comprar', App.CHECK_BEFORE)}${block('after', 'Después de cada reporte', App.CHECK_AFTER)}</div>
      <div class="card"><h3>Cuándo NO compro</h3><div class="md">${App.mdLite((st.guide.find((x) => x.id === 'nocompro') || { body: '' }).body)}</div></div>`;
    App.$$('[data-ck]', body).forEach((c) => (c.onchange = () => { const [k, i] = c.dataset.ck.split(':'); App.Store.set((s) => (s.checks[k][i] = c.checked)); App.refresh(); }));
    App.$$('[data-reset]', body).forEach((b) => (b.onclick = () => { App.Store.set((s) => (s.checks[b.dataset.reset] = {})); App.refresh(); }));
  }

  /* ---- Mapa de empresas (se arma solo con el estado de cada tesis) ---- */
  function tabMapa(body, st) {
    const order = ['comprada_tesis', 'comprada_antes', 'descartada', 'analizada', 'radar', 'fuera'];
    body.innerHTML = `<div class="card"><div class="tablewrap"><table class="tbl"><thead><tr><th>Estado</th><th>Empresas</th></tr></thead><tbody>${order.map((s) => {
      const items = Object.entries(st.theses).filter(([, t]) => t.status === s);
      return `<tr><td><span class="chip st-${App.STATUS[s].c}">${App.STATUS[s].l}</span></td><td>${items.length ? items.map(([k, t]) => `<a class="chip link" href="#/tesis/${encodeURIComponent(k)}" title="${esc(t.notes)}">${esc(t.name)} <small>${esc(k)}</small></a>`).join(' ') : '<span class="muted">—</span>'}</td></tr>`;
    }).join('')}</tbody></table></div><p class="muted sm">Cambia el estado de una empresa desde su pantalla de Tesis y este mapa se actualiza solo.</p></div>`;
  }

  /* ---- Diario ---- */
  function tabDiario(body, st) {
    const list = [...st.journal].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    body.innerHTML = `<div class="card"><h3>Diario de decisiones</h3><p class="muted sm">Anota qué pensabas y por qué actuaste (o no). Ayuda a revisar la emoción vs. las reglas.</p>
      <div class="grid2">${App.field('Fecha', `<input type="date" id="j-d" value="${App.today()}">`)}${App.field('Ticker (opcional)', '<input id="j-t" autocapitalize="characters">')}</div>
      ${App.field('Nota', '<textarea id="j-n" rows="3" placeholder="Hoy decidí… porque… Mi tesis sigue/cambió porque…"></textarea>')}<button class="btn primary" id="j-add">Guardar nota</button></div>
      ${list.map((j) => `<div class="card note"><div class="row between"><b>${App.fmtDate(j.date)} ${j.ticker ? `<span class="chip">${esc(j.ticker)}</span>` : ''}</b><button class="icon-btn" data-jd="${j.id}">🗑</button></div><p>${esc(j.text).replace(/\n/g, '<br>')}</p></div>`).join('')}`;
    App.$('#j-add', body).onclick = () => { const t = App.$('#j-n', body).value.trim(); if (!t) return; App.Store.set((s) => s.journal.push({ id: App.uid(), date: App.$('#j-d', body).value, ticker: App.$('#j-t', body).value.trim().toUpperCase(), text: t })); App.refresh(); };
    App.$$('[data-jd]', body).forEach((b) => (b.onclick = () => { App.Store.set((s) => (s.journal = s.journal.filter((x) => x.id !== b.dataset.jd))); App.refresh(); }));
  }
})(window);
