/* Vista: Movimientos (compras, ventas, dividendos, depósitos, retiros) + formulario reutilizable. */
(function (g) {
  const App = g.App;
  const { esc } = App;

  /**
   * Abre el formulario de movimiento.  prefill: {type, ticker, qty, price, reason, ...}  ·  editId: id existente
   * onSaved(): callback opcional
   */
  App.openMovement = (prefill = {}, editId, onSaved) => {
    const st = App.Store.state;
    const base = editId ? st.movements.find((m) => m.id === editId) : null;
    const m = Object.assign({ type: 'compra', date: App.today(), ticker: '', qty: '', price: '', fees: 0, fx: st.settings.fx, amount: '', currency: 'USD', affectsCash: true, reason: '', sellRules: '' }, base || prefill);
    const known = Array.from(new Set([...Object.keys(st.securities), ...Object.keys(st.theses)])).sort();

    const body = `
      <div class="grid2">
        ${App.field('Tipo', `<select id="m-type">${App.options(Object.entries(App.MOVE_TYPES).map(([v, l]) => ({ v, l })), m.type)}</select>`)}
        ${App.field('Fecha', `<input id="m-date" type="date" value="${esc(m.date)}">`)}
      </div>
      <div id="m-trade" class="grid2">
        ${App.field('Ticker', `<input id="m-ticker" list="m-tk" value="${esc(m.ticker)}" placeholder="NVDA" autocapitalize="characters"><datalist id="m-tk">${known.map((k) => `<option value="${esc(k)}">`).join('')}</datalist>`)}
        <div id="m-newsec" class="hidden">${App.field('Sector (valor nuevo)', `<select id="m-sector">${App.options(App.SECTORS, 'Otro')}</select>`)}</div>
        ${App.field('Cantidad de acciones', `<input id="m-qty" type="number" step="any" min="0" value="${m.qty}">`, 'Admite fracciones (0.25)')}
        ${App.field('Precio por acción (USD)', `<input id="m-price" type="number" step="any" min="0" value="${m.price}">`)}
        ${App.field('Comisión (USD)', `<input id="m-fees" type="number" step="any" min="0" value="${m.fees || 0}">`)}
      </div>
      <div id="m-cash" class="grid2">
        ${App.field('Monto', `<input id="m-amount" type="number" step="any" min="0" value="${m.amount}">`)}
        ${App.field('Moneda del monto', `<select id="m-cur">${App.options(['USD', 'MXN'], m.currency)}</select>`)}
      </div>
      <div class="grid2">
        ${App.field('Tipo de cambio (MXN por USD)', `<input id="m-fx" type="number" step="any" min="0" value="${m.fx}">`, 'El de ese día, para saber tu ganancia real en pesos.')}
        <label class="check pad"><input id="m-aff" type="checkbox" ${m.affectsCash !== false ? 'checked' : ''}><span>Afecta mi efectivo</span></label>
      </div>
      <div id="m-total" class="calc-note"></div>
      ${App.field('¿Por qué lo hice? (motivo / tesis)', `<textarea id="m-reason" rows="2" placeholder="Fecha, cantidad, precio, tipo de cambio y por qué compré…">${esc(m.reason)}</textarea>`)}
      <div id="m-sr">${App.field('Reglas de venta definidas antes de comprar', `<textarea id="m-sell" rows="2" placeholder="Vendo una parte si… / vendo todo si se juntan 2 de…">${esc(m.sellRules || '')}</textarea>`, 'Tu checklist: escribir las reglas de venta ANTES de comprar.')}</div>
      <p class="muted sm" id="m-hint">Si ya tenías esas acciones antes de usar la app, registra la compra con su fecha original y desmarca “Afecta mi efectivo” para no descuadrar el efectivo.</p>`;

    App.modal({
      title: editId ? 'Editar movimiento' : 'Nuevo movimiento', wide: true, body,
      onOpen(ov) {
        const $ = (s) => App.$(s, ov);
        const sync = () => {
          const t = $('#m-type').value, trade = t === 'compra' || t === 'venta';
          $('#m-trade').classList.toggle('hidden', !(trade || t === 'dividendo'));
          App.$$('#m-qty,#m-price,#m-fees', ov).forEach((i) => i.closest('label').classList.toggle('hidden', !trade));
          $('#m-cash').classList.toggle('hidden', trade);
          $('#m-sr').classList.toggle('hidden', t !== 'compra');
          $('#m-hint').classList.toggle('hidden', t !== 'compra');
          const tk = $('#m-ticker').value.trim().toUpperCase();
          $('#m-newsec').classList.toggle('hidden', !(tk && !st.securities[tk] && trade));
          if (trade) {
            const tot = (Number($('#m-qty').value) || 0) * (Number($('#m-price').value) || 0) + (Number($('#m-fees').value) || 0);
            const fx = Number($('#m-fx').value) || 0;
            $('#m-total').innerHTML = tot ? `Total: <b>${App.usd(tot)}</b> ≈ <b>${App.mxn(tot * fx, 0)}</b>` : '';
          } else $('#m-total').innerHTML = '';
        };
        App.$$('input,select', ov).forEach((i) => i.addEventListener('input', sync));
        // Autocompletar el precio con el último conocido
        $('#m-ticker').addEventListener('change', () => {
          const s = st.securities[$('#m-ticker').value.trim().toUpperCase()];
          if (s && s.price && !$('#m-price').value) $('#m-price').value = s.price;
          sync();
        });
        sync();
      },
      actions: [{ label: 'Cancelar' }, {
        label: 'Guardar', primary: true,
        onClick: (close, ov) => {
          const $ = (s) => App.$(s, ov);
          const type = $('#m-type').value, trade = type === 'compra' || type === 'venta';
          const ticker = $('#m-ticker').value.trim().toUpperCase();
          const rec = {
            id: editId || App.uid(), date: $('#m-date').value || App.today(), type, ticker,
            qty: Number($('#m-qty').value) || 0, price: Number($('#m-price').value) || 0, fees: Number($('#m-fees').value) || 0,
            amount: Number($('#m-amount').value) || 0, currency: $('#m-cur').value, fx: Number($('#m-fx').value) || App.fx(),
            affectsCash: $('#m-aff').checked, reason: $('#m-reason').value.trim(), sellRules: $('#m-sell').value.trim(),
          };
          if (base && base.demo) rec.demo = true;
          if (trade && (!ticker || rec.qty <= 0 || rec.price <= 0)) { App.toast('Falta ticker, cantidad o precio', 'bad'); return false; }
          if (type === 'dividendo' && (!ticker || rec.amount <= 0)) { App.toast('Falta ticker o monto', 'bad'); return false; }
          if ((type === 'deposito' || type === 'retiro') && rec.amount <= 0) { App.toast('Falta el monto', 'bad'); return false; }
          App.Store.set((s) => {
            if (trade && !s.securities[ticker]) {
              const th = s.theses[ticker];
              s.securities[ticker] = { ticker, name: th ? th.name : ticker, sector: th ? th.sector : $('#m-sector').value, type: $('#m-sector').value === 'ETF base' ? 'etf' : 'stock', price: type === 'compra' ? rec.price : null, priceUpdated: null };
            }
            if (trade && s.securities[ticker] && !s.securities[ticker].price) s.securities[ticker].price = rec.price;
            if (editId) { const i = s.movements.findIndex((x) => x.id === editId); s.movements[i] = rec; } else s.movements.push(rec);
            // si compra de una empresa con tesis marcada como radar/analizada → pasa a comprada con tesis
            if (type === 'compra' && s.theses[ticker] && ['radar', 'analizada'].includes(s.theses[ticker].status)) s.theses[ticker].status = 'comprada_tesis';
          });
          App.toast(editId ? 'Movimiento actualizado' : 'Movimiento registrado', 'ok');
          onSaved ? onSaved() : App.refresh();
        },
      }],
    });
  };

  let F = { type: '', q: '' };

  App.views.movimientos = {
    title: 'Movimientos',
    render(el) {
      const st = App.Store.state;
      const led = Calc.computeLedger(st.movements, st.settings.fx);
      const list = [...st.movements]
        .filter((m) => (!F.type || m.type === F.type) && (!F.q || (m.ticker || '').includes(F.q.toUpperCase()) || (m.reason || '').toLowerCase().includes(F.q.toLowerCase())))
        .sort((a, b) => b.date.localeCompare(a.date));
      const cashIn = led.deposits - led.withdrawals;

      // Aportes netos acumulados
      let acc = 0;
      const pts = [...st.movements].filter((m) => m.type === 'deposito' || m.type === 'retiro').sort((a, b) => a.date.localeCompare(b.date)).map((m) => {
        const fx = Number(m.fx) || st.settings.fx;
        const v = (m.currency === 'MXN' ? m.amount / fx : m.amount) * (m.type === 'retiro' ? -1 : 1);
        acc += v; return { x: App.fmtDate(m.date), y: acc };
      });

      el.innerHTML = `
      <div class="row between wrap gap">
        <div class="row gap wrap">
          <select id="f-type"><option value="">Todos los tipos</option>${App.options(Object.entries(App.MOVE_TYPES).map(([v, l]) => ({ v, l })), F.type)}</select>
          <input id="f-q" placeholder="Buscar ticker o motivo…" value="${esc(F.q)}"></div>
        <div class="row gap wrap"><button class="btn" id="b-csv">Exportar CSV</button><button class="btn primary" id="b-new">+ Movimiento</button></div></div>
      <div class="kpis">
        <div class="kpi"><span>Aportado neto</span><b>${App.money(cashIn)}</b><small>depósitos − retiros</small></div>
        <div class="kpi"><span>Comprado</span><b>${App.money(led.bought)}</b><small>${st.movements.filter((m) => m.type === 'compra').length} compras</small></div>
        <div class="kpi"><span>Vendido</span><b>${App.money(led.sold)}</b><small>${st.movements.filter((m) => m.type === 'venta').length} ventas</small></div>
        <div class="kpi"><span>Dividendos</span><b>${App.money(led.dividends)}</b><small>cobrados</small></div>
        <div class="kpi"><span>Ganancia realizada</span><b class="${led.realized >= 0 ? 'pos' : 'neg'}">${App.money(led.realized)}</b><small>comisiones: ${App.usd(led.fees)}</small></div>
      </div>
      ${pts.length > 1 ? `<div class="card"><h3>Aportes netos acumulados (USD)</h3>${App.lineChart(pts, (v) => App.usd(v))}</div>` : ''}
      <div class="card">
        ${list.length ? `<div class="tablewrap"><table class="tbl">
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Valor</th><th class="r">Cantidad</th><th class="r">Precio</th><th class="r">Monto</th><th class="r">TC</th><th>Motivo</th><th></th></tr></thead>
          <tbody>${list.map((m) => {
            const trade = m.type === 'compra' || m.type === 'venta';
            const amt = trade ? m.qty * m.price + (m.type === 'compra' ? m.fees : -m.fees) : (m.currency === 'MXN' ? m.amount / (m.fx || App.fx()) : m.amount);
            return `<tr>
              <td>${App.fmtDate(m.date)}</td>
              <td><span class="chip t-${m.type}">${App.MOVE_TYPES[m.type]}</span>${m.affectsCash === false ? '<small class="block muted">sin efectivo</small>' : ''}</td>
              <td>${m.ticker ? `<a class="tk" href="#/tesis/${encodeURIComponent(m.ticker)}">${esc(m.ticker)}</a>` : '—'}</td>
              <td class="r">${trade ? App.num(m.qty, 4) : ''}</td><td class="r">${trade ? App.usd(m.price) : ''}</td>
              <td class="r">${App.usd(amt)}<small class="block muted">${App.mxn(amt * (m.fx || App.fx()), 0)}</small></td>
              <td class="r">${m.fx ? Number(m.fx).toFixed(2) : ''}</td>
              <td class="reason">${esc(m.reason || '')}${m.sellRules ? `<small class="block muted">Venta: ${esc(m.sellRules)}</small>` : ''}</td>
              <td class="r nowrap"><button class="icon-btn" data-ed="${m.id}" title="Editar">✎</button><button class="icon-btn" data-del="${m.id}" title="Eliminar">🗑</button></td></tr>`;
          }).join('')}</tbody></table></div>` : '<div class="empty">No hay movimientos con ese filtro.</div>'}
      </div>`;

      App.$('#f-type').onchange = (e) => { F.type = e.target.value; App.refresh(); };
      App.$('#f-q').oninput = (e) => { F.q = e.target.value; const pos = e.target.selectionStart; App.refresh(); const i = App.$('#f-q'); i.focus(); i.setSelectionRange(pos, pos); };
      App.$('#b-new').onclick = () => App.openMovement();
      App.$('#b-csv').onclick = () => {
        const head = ['fecha', 'tipo', 'ticker', 'cantidad', 'precio_usd', 'comision_usd', 'monto', 'moneda', 'tipo_cambio', 'afecta_efectivo', 'motivo', 'reglas_venta'];
        const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows = [...st.movements].sort((a, b) => a.date.localeCompare(b.date)).map((m) => [m.date, m.type, m.ticker, m.qty, m.price, m.fees, m.amount, m.currency, m.fx, m.affectsCash !== false, m.reason, m.sellRules].map(q).join(','));
        App.download('movimientos.csv', '﻿' + [head.join(','), ...rows].join('\n'), 'text/csv');
      };
      App.$$('[data-ed]', el).forEach((b) => (b.onclick = () => App.openMovement({}, b.dataset.ed)));
      App.$$('[data-del]', el).forEach((b) => (b.onclick = () => App.confirm('¿Eliminar este movimiento? El portafolio se recalculará.', () => { App.Store.set((s) => (s.movements = s.movements.filter((x) => x.id !== b.dataset.del))); App.refresh(); }, 'Eliminar')));
    },
  };
})(window);
