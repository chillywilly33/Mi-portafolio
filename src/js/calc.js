/* Lógica pura de cálculo (sin DOM). Funciona en navegador, Electron y Node (para pruebas / futuro backend).
 * Convención: todo en USD internamente. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

  /** Reconstruye posiciones y efectivo a partir de los movimientos. */
  function computeLedger(movements, defaultFx) {
    const pos = {};
    let cash = 0, deposits = 0, withdrawals = 0, dividends = 0, realized = 0, bought = 0, sold = 0, fees = 0;
    const issues = [];
    const sorted = movements
      .map((m, i) => ({ m, i }))
      .sort((a, b) => (a.m.date || '').localeCompare(b.m.date || '') || a.i - b.i)
      .map((x) => x.m);
    for (const m of sorted) {
      const fx = Number(m.fx) || defaultFx || 1;
      const affects = m.affectsCash !== false;
      const t = (m.ticker || '').toUpperCase();
      const qty = Number(m.qty) || 0, price = Number(m.price) || 0, fee = Number(m.fees) || 0;
      const amtUSD = (m.currency === 'MXN' ? (Number(m.amount) || 0) / fx : Number(m.amount) || 0);
      if (m.type === 'compra') {
        const p = (pos[t] = pos[t] || { ticker: t, qty: 0, cost: 0, costMXN: 0, realized: 0, dividends: 0 });
        const cost = qty * price + fee;
        p.qty += qty; p.cost += cost; p.costMXN += cost * fx;
        bought += qty * price; fees += fee;
        if (affects) cash -= cost;
      } else if (m.type === 'venta') {
        const p = (pos[t] = pos[t] || { ticker: t, qty: 0, cost: 0, costMXN: 0, realized: 0, dividends: 0 });
        let q = qty;
        if (q > p.qty + 1e-9) { issues.push(`Venta de ${t} (${m.date}) mayor a lo que tenías (${p.qty}).`); q = p.qty; }
        const frac = p.qty > 0 ? q / p.qty : 0;
        const costOut = p.cost * frac;
        p.costMXN -= p.costMXN * frac;
        p.cost -= costOut; p.qty -= q;
        const proceeds = q * price - fee;
        p.realized += proceeds - costOut; realized += proceeds - costOut;
        sold += q * price; fees += fee;
        if (affects) cash += proceeds;
        if (p.qty < 1e-9) { p.qty = 0; p.cost = 0; p.costMXN = 0; }
      } else if (m.type === 'dividendo') {
        dividends += amtUSD;
        if (pos[t]) pos[t].dividends += amtUSD;
        if (affects) cash += amtUSD;
      } else if (m.type === 'deposito') {
        deposits += amtUSD; if (affects) cash += amtUSD;
      } else if (m.type === 'retiro') {
        withdrawals += amtUSD; if (affects) cash -= amtUSD;
      }
    }
    return { positions: pos, cash, deposits, withdrawals, dividends, realized, bought, sold, fees, issues };
  }

  /** Resumen del portafolio con pesos, sectores y bloques. */
  function summarize(state) {
    const fx = Number(state.settings.fx) || 1;
    const led = computeLedger(state.movements, fx);
    const rows = Object.values(led.positions)
      .filter((p) => p.qty > 1e-9)
      .map((p) => {
        const sec = state.securities[p.ticker] || {};
        const avg = p.qty ? p.cost / p.qty : 0;
        const hasPrice = sec.price != null && sec.price > 0;
        const price = hasPrice ? Number(sec.price) : avg;
        const value = p.qty * price;
        return {
          ticker: p.ticker, name: sec.name || p.ticker, sector: sec.sector || 'Otro', type: sec.type || 'stock',
          qty: p.qty, avg, price, hasPrice, value, cost: p.cost, costMXN: p.costMXN,
          gain: value - p.cost, gainPct: p.cost ? ((value - p.cost) / p.cost) * 100 : 0,
          realized: p.realized, dividends: p.dividends,
        };
      })
      .sort((a, b) => b.value - a.value);
    const invested = rows.reduce((s, r) => s + r.value, 0);
    const cash = led.cash;
    const total = invested + Math.max(cash, 0);
    rows.forEach((r) => (r.weight = total ? (r.value / total) * 100 : 0));
    const cost = rows.reduce((s, r) => s + r.cost, 0);
    const costMXN = rows.reduce((s, r) => s + r.costMXN, 0);

    const blocks = {};
    rows.forEach((r) => (blocks[r.sector] = (blocks[r.sector] || 0) + r.value));
    if (cash > 0) blocks['Efectivo'] = cash;
    const blockPct = {};
    Object.keys(blocks).forEach((k) => (blockPct[k] = total ? (blocks[k] / total) * 100 : 0));

    // Posiciones efectivas = 1 / Σ w²  (más alto = más diversificado)
    const hhi = rows.reduce((s, r) => s + (r.weight / 100) ** 2, 0) + (total && cash > 0 ? (cash / total) ** 2 : 0);
    const effective = hhi ? 1 / hhi : 0;

    const etfPct = blockPct['ETF base'] || 0;
    const techDirect = blockPct['Tecnología'] || 0;
    const techReal = techDirect + (etfPct * (Number(state.settings.vooTechPct) || 0)) / 100;

    return {
      rows, led, cash, invested, total, cost, costMXN,
      gain: invested - cost, gainPct: cost ? ((invested - cost) / cost) * 100 : 0,
      gainMXN: invested * fx - costMXN,
      blocks, blockPct, effective, techReal, techDirect, fx,
    };
  }

  /** Revisa las reglas de la guía (topes, colchón de efectivo, ETF base). */
  function checkRules(sum, settings, theses) {
    const out = [];
    const caps = settings.caps;
    if (!sum.rows.length && sum.cash <= 0) return out;
    sum.rows.forEach((r) => {
      if (r.sector === 'ETF base') return; // el ETF base no cuenta para el tope individual
      if (r.weight > caps.position)
        out.push({ level: 'warn', text: `${r.ticker} pesa ${r.weight.toFixed(1)}% (tope ${caps.position}%). Regla: vender 20-30% o diluir comprando otras cosas.` });
      else {
        const conv = theses && theses[r.ticker] && theses[r.ticker].conviction;
        const cap = { alta: 8, normal: 6, chica: 3 }[conv];
        if (cap && r.weight > cap)
          out.push({ level: 'info', text: `${r.ticker} pesa ${r.weight.toFixed(1)}%: arriba del tope de su convicción ${conv} (${cap}%).` });
      }
    });
    Object.entries(sum.blockPct).forEach(([sec, p]) => {
      if (sec === 'ETF base' || sec === 'Efectivo') return;
      if (p > caps.sector)
        out.push({ level: 'warn', text: `El sector ${sec} pesa ${p.toFixed(1)}% (tope ${caps.sector}%). Regla: vender 20-30% de la posición mayor.` });
    });
    const cashPct = sum.total ? (Math.max(sum.cash, 0) / sum.total) * 100 : 0;
    if (cashPct < caps.cashMin)
      out.push({ level: 'info', text: `Efectivo ${cashPct.toFixed(1)}%: debajo de tu colchón (${caps.cashMin}-${caps.cashMax}%) para oportunidades.` });
    else if (cashPct > caps.cashMax)
      out.push({ level: 'info', text: `Efectivo ${cashPct.toFixed(1)}%: arriba de ${caps.cashMax}%. ¿Hay oportunidades que cumplan tu filtro?` });
    const missing = [];
    (settings.targets || []).forEach((t) => {
      if (t.max == null) return;
      const p = sum.blockPct[t.block] || 0;
      if (p > t.max) out.push({ level: 'info', text: `${t.block}: ${p.toFixed(1)}% (rango ${t.min}-${t.max}%). Arriba del objetivo.` });
      else if (p < t.min && t.block !== 'Efectivo') {
        if (p === 0) missing.push(t.block);
        else out.push({ level: 'info', text: `${t.block}: ${p.toFixed(1)}% (rango ${t.min}-${t.max}%). Debajo del objetivo.` });
      }
    });
    if (missing.length) out.push({ level: 'info', text: `Sin posiciones todavía en: ${missing.join(', ')} (tu mezcla objetivo los contempla).` });
    sum.led.issues.forEach((t) => out.push({ level: 'warn', text: t }));
    if (!out.length) out.push({ level: 'ok', text: 'Todo dentro de tus topes y rangos.' });
    return out;
  }

  /**
   * Calculadora de compra escalonada (paso 3 de “Cómo compro”):
   *   monto = % objetivo × valor total del portafolio, dividido en 2-4 compras.
   */
  function planPurchase(o) {
    const total = Math.max(0, Number(o.total) || 0);
    const newMoney = Math.max(0, Number(o.newMoney) || 0);
    const base = total + newMoney;
    const pct = Number(o.pct) || 0;
    const existing = Math.max(0, Number(o.existingValue) || 0);
    const price = Number(o.price) || 0;
    const n = Math.max(1, Math.min(8, Math.round(Number(o.n) || 1)));
    let shares = Array.isArray(o.shares) && o.shares.length === n ? o.shares.map(Number) : Array(n).fill(100 / n);
    const sumShares = shares.reduce((a, b) => a + b, 0);
    const targetAmt = (base * pct) / 100;
    const toBuy = o.subtractExisting ? Math.max(0, targetAmt - existing) : targetAmt;
    const tranches = shares.map((s, i) => {
      const amount = (toBuy * s) / 100;
      return { i: i + 1, share: s, amount, qty: price > 0 ? amount / price : null };
    });
    const posAfter = base ? ((existing + toBuy) / base) * 100 : 0;
    const sectorAfter = base ? (((Number(o.sectorValue) || 0) + toBuy) / base) * 100 : 0;
    const available = (Number(o.cash) || 0) + newMoney;
    const warnings = [];
    if (!pct) warnings.push({ level: 'info', text: 'Define el % objetivo de la posición.' });
    if (!o.isEtfBase && posAfter > o.positionCap)
      warnings.push({ level: 'warn', text: `La posición quedaría en ${posAfter.toFixed(1)}%, arriba del tope individual de ${o.positionCap}%.` });
    if (!o.isEtfBase && o.sector !== 'ETF base' && sectorAfter > o.sectorCap)
      warnings.push({ level: 'warn', text: `El sector ${o.sector || ''} quedaría en ${sectorAfter.toFixed(1)}%, arriba del tope de ${o.sectorCap}%.` });
    if (toBuy > available + 0.005)
      warnings.push({ level: 'warn', text: `Necesitas ${toBuy.toFixed(2)} USD y solo tienes ${available.toFixed(2)} USD disponibles (efectivo + aporte nuevo).` });
    if (n > 4) warnings.push({ level: 'info', text: 'Tu método usa 2 a 4 compras; más de 4 diluye el efecto.' });
    if (n === 1 && toBuy > 0) warnings.push({ level: 'info', text: 'Tu método pide escalonar (2 a 4 compras). Una sola compra rompe esa regla.' });
    if (Math.abs(sumShares - 100) > 0.01) warnings.push({ level: 'warn', text: `Los porcentajes de cada compra suman ${sumShares.toFixed(1)}%, deben sumar 100%.` });
    if (existing >= targetAmt && o.subtractExisting && pct)
      warnings.push({ level: 'ok', text: 'Ya alcanzaste (o superaste) el % objetivo: no necesitas comprar más.' });
    if (price <= 0) warnings.push({ level: 'info', text: 'Sin precio actual no puedo calcular cuántas acciones; escríbelo o actualiza precios.' });
    return { base, targetAmt, existing, toBuy, tranches, posAfter, sectorAfter, available, warnings, sumShares };
  }

  /** Filtro de 15 preguntas: 5 filtros × 3 preguntas; un filtro pasa con 3 “sí”. */
  function score(filters) {
    const f = Array.isArray(filters) ? filters : [];
    const per = [0, 1, 2, 3, 4].map((k) => {
      const part = [f[k * 3], f[k * 3 + 1], f[k * 3 + 2]];
      const yes = part.filter((v) => v === true).length;
      const answered = part.filter((v) => v === true || v === false).length;
      return { yes, answered, pass: yes === 3, complete: answered === 3 };
    });
    const passes = per.filter((p) => p.pass).length;
    const answered = per.reduce((s, p) => s + p.answered, 0);
    let label = 'Incompleto', level = 'none', advice = `Responde las ${15 - answered} preguntas que faltan.`;
    if (answered === 15) {
      if (passes === 5) { label = 'Convicción alta'; level = 'high'; advice = '5 de 5: convicción alta.'; }
      else if (passes >= 3) { label = 'Buena empresa con matices'; level = 'mid'; advice = `${passes} de 5: posición normal o chica y vigilar los puntos que fallaron.`; }
      else { label = 'No comprar todavía'; level = 'low'; advice = `${passes} de 5: no comprar todavía.`; }
    }
    return { per, passes, answered, label, level, advice };
  }

  return { computeLedger, summarize, checkRules, planPurchase, score, round };
});
