/* Vista: Calculadora de compra escalonada.
 * monto = % objetivo × valor del portafolio  →  dividido en N compras (2 a 4 en tu método). */
(function (g) {
  const App = g.App;
  const { esc } = App;
  const S = { ticker: '', sector: 'Tecnología', price: '', pct: '', n: 4, total: '', totalManual: false, newMoney: 0, subtract: true, shares: null, conds: [] };

  App.views.calculadora = {
    title: 'Calculadora de compra',
    render(el, arg) {
      const st = App.Store.state;
      const sum = Calc.summarize(st);
      if (arg && arg !== S.ticker) loadTicker(arg, st);
      if (!S.totalManual) S.total = sum.total ? Number(sum.total.toFixed(2)) : '';
      const tickers = Array.from(new Set([...Object.keys(st.theses), ...Object.keys(st.securities)])).sort();

      el.innerHTML = `<div class="split calc">
        <div class="card">
          <h3>1 · ¿Qué quiero comprar?</h3>
          ${App.field('Empresa (ticker)', `<input id="c-tk" list="c-tl" value="${esc(S.ticker)}" placeholder="NVDA" autocapitalize="characters"><datalist id="c-tl">${tickers.map((t) => `<option value="${esc(t)}">${esc((st.theses[t] || st.securities[t] || {}).name || '')}</option>`).join('')}</datalist>`)}
          <div class="grid2">
            ${App.field('Sector', `<select id="c-sec">${App.options(App.SECTORS, S.sector)}</select>`)}
            ${App.field('Precio actual (USD)', `<input id="c-px" type="number" step="any" min="0" value="${S.price}">`)}
          </div>
          <h3 class="mt">2 · ¿Cuánto vale mi portafolio?</h3>
          <div class="grid2">
            ${App.field('Valor total (USD)', `<input id="c-tot" type="number" step="any" min="0" value="${S.total}">`, S.totalManual ? 'Valor escrito a mano. <a href="#" id="c-auto">Usar el de la app</a>' : `Automático desde Portafolio (${App.mxn(sum.total * sum.fx, 0)})`)}
            ${App.field('Aporte nuevo (USD)', `<input id="c-new" type="number" step="any" min="0" value="${S.newMoney}">`, 'Dinero fresco que vas a meter además.')}
          </div>
          <h3 class="mt">3 · ¿Cuánto quiero que pese y en cuántas compras?</h3>
          <div class="grid2">
            ${App.field('% objetivo de la posición', `<input id="c-pct" type="number" step="any" min="0" max="100" value="${S.pct}">`, 'Alta convicción hasta 8% · normal 3-6% · chica 2-3%')}
            ${App.field('Número de compras', `<select id="c-n">${App.options([1, 2, 3, 4, 5, 6].map((v) => ({ v, l: v + (v >= 2 && v <= 4 ? ' (método)' : '') })), S.n)}</select>`, 'Tu método: 2 a 4 compras de 25-33%.')}
          </div>
          <label class="check"><input type="checkbox" id="c-sub" ${S.subtract ? 'checked' : ''}><span>Restar lo que ya tengo de esta empresa</span></label>
          <div class="pill-info" id="c-have"></div>
        </div>
        <div id="c-res"></div></div>
      <div class="card"><div class="row between"><h3>Mis planes de compra guardados</h3></div><div id="c-plans"></div></div>`;

      const $ = (s) => App.$(s, el);
      const read = () => {
        S.ticker = $('#c-tk').value.trim().toUpperCase();
        S.sector = $('#c-sec').value;
        S.price = $('#c-px').value;
        S.total = $('#c-tot').value;
        S.newMoney = $('#c-new').value;
        S.pct = $('#c-pct').value;
        S.subtract = $('#c-sub').checked;
      };
      $('#c-tk').addEventListener('change', () => { read(); loadTicker(S.ticker, st); App.refresh(); });
      $('#c-n').onchange = (e) => { S.n = Number(e.target.value); S.shares = null; paint(); };
      ['#c-sec', '#c-px', '#c-new', '#c-pct', '#c-sub'].forEach((id) => $(id).addEventListener('input', () => { read(); paint(); }));
      $('#c-tot').addEventListener('input', () => { read(); S.totalManual = true; paint(); });
      const auto = $('#c-auto'); if (auto) auto.onclick = (e) => { e.preventDefault(); S.totalManual = false; App.refresh(); };

      const paint = () => {
        const pos = sum.rows.find((r) => r.ticker === S.ticker);
        const secVal = sum.rows.filter((r) => r.sector === S.sector).reduce((a, r) => a + r.value, 0);
        const isEtf = S.sector === 'ETF base';
        $('#c-have').innerHTML = pos ? `Ya tengo <b>${App.num(pos.qty, 4)}</b> acciones de ${esc(S.ticker)} = <b>${App.usd(pos.value)}</b> (${pos.weight.toFixed(1)}%). Sector ${esc(S.sector)}: ${(sum.blockPct[S.sector] || 0).toFixed(1)}%.` : `No tengo ${esc(S.ticker || 'esta empresa')} todavía. Sector ${esc(S.sector)}: ${(sum.blockPct[S.sector] || 0).toFixed(1)}%.`;
        const shares = S.shares && S.shares.length === S.n ? S.shares : Array(S.n).fill(100 / S.n);
        const r = Calc.planPurchase({ total: S.total, newMoney: S.newMoney, pct: S.pct, existingValue: pos ? pos.value : 0, subtractExisting: S.subtract, n: S.n, shares, price: S.price, sectorValue: secVal, sector: S.sector, sectorCap: st.settings.caps.sector, positionCap: st.settings.caps.position, isEtfBase: isEtf, cash: Math.max(sum.cash, 0) });
        const fx = sum.fx;
        S.shares = shares;
        $('#c-res').innerHTML = `
        <div class="card result">
          <h3>Resultado</h3>
          <div class="res-grid">
            <div><span>Base (portafolio + aporte)</span><b>${App.usd(r.base)}</b><small>${App.mxn(r.base * fx, 0)}</small></div>
            <div><span>Monto objetivo (${S.pct || 0}%)</span><b>${App.usd(r.targetAmt)}</b><small>${App.mxn(r.targetAmt * fx, 0)}</small></div>
            <div><span>Falta comprar</span><b class="hl">${App.usd(r.toBuy)}</b><small>${App.mxn(r.toBuy * fx, 0)}</small></div>
          </div>
          <div class="tablewrap"><table class="tbl compact"><thead><tr><th>#</th><th class="r">% de la compra</th><th class="r">Monto USD</th><th class="r">≈ MXN</th><th class="r">Acciones</th><th>Condición de esta compra</th></tr></thead>
          <tbody>${r.tranches.map((t, i) => `<tr><td>${t.i}</td>
            <td class="r"><input class="mini-in" data-sh="${i}" type="number" step="any" value="${Number(t.share.toFixed(2))}"></td>
            <td class="r"><b>${App.usd(t.amount)}</b></td><td class="r">${App.mxn(t.amount * fx, 0)}</td>
            <td class="r">${t.qty != null ? App.num(t.qty, 4) : '—'}</td>
            <td><input class="cond" data-cond="${i}" placeholder="Reporte, fecha o caída real…" value="${esc(S.conds[i] || '')}"></td></tr>`).join('')}</tbody></table></div>
          <p class="muted sm">Posición final ≈ <b>${r.posAfter.toFixed(1)}%</b> · Sector ${esc(S.sector)} ≈ <b>${r.sectorAfter.toFixed(1)}%</b> · Efectivo disponible: <b>${App.usd(r.available)}</b></p>
          <ul class="alerts">${r.warnings.map((w) => `<li class="${w.level}">${esc(w.text)}</li>`).join('')}</ul>
          <div class="row gap wrap"><button class="btn primary" id="c-save">Guardar como plan</button><button class="btn" id="c-th">Ver tesis</button></div>
          <p class="muted sm">Recuerda recalcular cada vez que compres: el valor del portafolio cambia.</p>
        </div>`;
        App.$$('[data-sh]', el).forEach((i) => (i.onchange = () => { S.shares[Number(i.dataset.sh)] = Number(i.value) || 0; paint(); }));
        App.$$('[data-cond]', el).forEach((i) => (i.oninput = () => (S.conds[Number(i.dataset.cond)] = i.value)));
        $('#c-th').onclick = () => (st.theses[S.ticker] ? App.go('tesis', S.ticker) : App.toast('No hay tesis para ese ticker aún. Créala en Tesis.', 'info'));
        $('#c-save').onclick = () => {
          if (!S.ticker || !S.pct) return App.toast('Falta ticker y % objetivo', 'bad');
          App.Store.set((s) => {
            const plan = { id: App.uid(), ticker: S.ticker, pct: Number(S.pct), n: S.n, shares: [...S.shares], conditions: Array.from({ length: S.n }, (_, i) => S.conds[i] || ''), done: Array(S.n).fill(false) };
            const i = s.plans.findIndex((p) => p.ticker === S.ticker);
            if (i >= 0) { plan.id = s.plans[i].id; s.plans[i] = plan; } else s.plans.push(plan);
            if (s.theses[S.ticker]) s.theses[S.ticker].targetPct = Number(S.pct);
          });
          App.toast('Plan guardado', 'ok'); plans();
        };
      };

      const plans = () => {
        const ps = App.Store.state.plans;
        const box = $('#c-plans');
        if (!ps.length) { box.innerHTML = '<div class="empty small">Aún no hay planes. Calcula uno y pulsa “Guardar como plan”.</div>'; return; }
        const s2 = Calc.summarize(App.Store.state);
        box.innerHTML = ps.map((p) => {
          const pos = s2.rows.find((r) => r.ticker === p.ticker);
          const base = s2.total, toBuy = Math.max(0, (base * p.pct) / 100 - (pos ? pos.value : 0));
          const doneN = p.done.filter(Boolean).length;
          return `<div class="plan"><div class="row between wrap"><div><b>${esc(p.ticker)}</b> · objetivo ${p.pct}% · ${p.n} compras <span class="chip">${doneN}/${p.n} hechas</span></div>
            <div class="row gap"><button class="btn sm" data-load="${p.id}">Abrir</button><button class="btn sm ghost" data-pdel="${p.id}">Quitar</button></div></div>
            <div class="tr-list">${p.shares.map((sh, i) => {
              const amt = (((base * p.pct) / 100) * sh) / 100; // referencia sobre el objetivo completo
              return `<label class="tr ${p.done[i] ? 'done' : ''}"><input type="checkbox" data-pd="${p.id}:${i}" ${p.done[i] ? 'checked' : ''}>
                <span>Compra ${i + 1} (${sh.toFixed(0)}%)<small>${esc(p.conditions[i] || 'sin condición')}</small></span>
                <b>${App.usd(amt)}</b><button class="btn sm" data-reg="${p.id}:${i}">Registrar</button></label>`;
            }).join('')}</div>
            <p class="muted sm">Aún faltan ≈ ${App.usd(toBuy)} para llegar al ${p.pct}% con el portafolio de hoy.</p></div>`;
        }).join('');
        App.$$('[data-pd]', box).forEach((c) => (c.onchange = () => { const [id, i] = c.dataset.pd.split(':'); App.Store.set((s) => (s.plans.find((p) => p.id === id).done[Number(i)] = c.checked)); plans(); }));
        App.$$('[data-reg]', box).forEach((b) => (b.onclick = () => {
          const [id, i] = b.dataset.reg.split(':'); const p = ps.find((x) => x.id === id);
          const amt = (((s2.total * p.pct) / 100) * p.shares[Number(i)]) / 100, sec = App.Store.state.securities[p.ticker];
          const px = sec && sec.price ? sec.price : '';
          App.openMovement({ type: 'compra', ticker: p.ticker, price: px, qty: px ? Number((amt / px).toFixed(4)) : '', reason: `Compra ${Number(i) + 1} de ${p.n} (plan ${p.pct}%). ${p.conditions[Number(i)] || ''}`.trim(), sellRules: (App.Store.state.theses[p.ticker] || {}).sellRules || '' }, null, () => { App.Store.set((s) => (s.plans.find((x) => x.id === id).done[Number(i)] = true)); App.refresh(); });
        }));
        App.$$('[data-pdel]', box).forEach((b) => (b.onclick = () => { App.Store.set((s) => (s.plans = s.plans.filter((p) => p.id !== b.dataset.pdel))); plans(); }));
        App.$$('[data-load]', box).forEach((b) => (b.onclick = () => { const p = ps.find((x) => x.id === b.dataset.load); loadTicker(p.ticker, App.Store.state); S.pct = p.pct; S.n = p.n; S.shares = [...p.shares]; S.conds = [...p.conditions]; App.refresh(); }));
      };
      paint(); plans();
    },
  };

  function loadTicker(tk, st) {
    S.ticker = (tk || '').toUpperCase();
    const th = st.theses[S.ticker], sec = st.securities[S.ticker];
    if (sec) { S.sector = sec.sector; S.price = sec.price ?? ''; } else if (th) S.sector = th.sector;
    const plan = st.plans.find((p) => p.ticker === S.ticker);
    if (plan) { S.pct = plan.pct; S.n = plan.n; S.shares = [...plan.shares]; S.conds = [...plan.conditions]; }
    else { S.pct = th && th.targetPct != null ? th.targetPct : ''; S.shares = null; S.conds = []; }
  }
})(window);
