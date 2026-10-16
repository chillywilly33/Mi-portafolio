/* Gráficas propias en SVG/HTML (sin dependencias, funcionan sin internet). */
(function (g) {
  const App = g.App;
  const esc = (s) => App.esc(s);

  // Paleta categórica (distinguible en tema claro y oscuro)
  App.PALETTE = ['#2f7dd1', '#e08a1e', '#2fa37a', '#c8483f', '#8a63d2', '#12a3b4', '#c9a227', '#d65a9b', '#6f8a3a', '#7b8794'];
  App.colorFor = (i) => App.PALETTE[i % App.PALETTE.length];

  /** Dona. items: [{label, value, color?}]  →  HTML (dona + leyenda con %) */
  App.donut = (items, opt = {}) => {
    const data = items.filter((i) => i.value > 0);
    const total = data.reduce((s, i) => s + i.value, 0);
    if (!total) return `<div class="empty small">Sin datos todavía</div>`;
    const R = 80, r = 52, C = 100;
    let a0 = -Math.PI / 2;
    const arcs = data
      .map((it, idx) => {
        const frac = it.value / total;
        const a1 = a0 + frac * Math.PI * 2 - (data.length > 1 ? 0.012 : 0);
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const p = (rad, a) => `${(C + rad * Math.cos(a)).toFixed(2)} ${(C + rad * Math.sin(a)).toFixed(2)}`;
        const d = frac > 0.9999
          ? `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${C - 0.01} ${C - R} L ${C - 0.01} ${C - r} A ${r} ${r} 0 1 0 ${C} ${C - r} Z`
          : `M ${p(R, a0)} A ${R} ${R} 0 ${large} 1 ${p(R, a1)} L ${p(r, a1)} A ${r} ${r} 0 ${large} 0 ${p(r, a0)} Z`;
        a0 += frac * Math.PI * 2;
        it._c = it.color || App.colorFor(idx);
        return `<path d="${d}" fill="${it._c}"><title>${esc(it.label)}: ${(frac * 100).toFixed(1)}%</title></path>`;
      })
      .join('');
    const legend = data
      .map(
        (it) => `<li><i style="background:${it._c}"></i><span class="lg-l">${esc(it.label)}</span><b>${((it.value / total) * 100).toFixed(1)}%</b></li>`
      )
      .join('');
    return `<div class="donut-wrap">
      <svg viewBox="0 0 200 200" class="donut" role="img" aria-label="${esc(opt.label || 'Distribución')}">${arcs}
        <text x="100" y="96" text-anchor="middle" class="donut-t1">${esc(opt.center || '')}</text>
        <text x="100" y="114" text-anchor="middle" class="donut-t2">${esc(opt.sub || '')}</text></svg>
      <ul class="legend">${legend}</ul></div>`;
  };

  /**
   * Barras con rango objetivo.  rows: [{label, actual, min, max, target}]  (todo en %)
   * La barra muestra el % actual; la franja marcada es el rango objetivo.
   */
  App.rangeBars = (rows) => {
    const maxScale = Math.max(60, ...rows.map((r) => Math.max(r.actual || 0, r.max || 0))) * 1.05;
    const pos = (v) => Math.min(100, (v / maxScale) * 100);
    return `<div class="rbars">${rows
      .map((r) => {
        const has = r.max != null;
        let st = 'ok';
        if (has && r.actual > r.max) st = 'over';
        else if (has && r.actual < r.min) st = 'under';
        return `<div class="rb-row">
        <div class="rb-l">${esc(r.label)}</div>
        <div class="rb-track">
          ${has ? `<div class="rb-range" style="left:${pos(r.min)}%;width:${Math.max(0.8, pos(r.max) - pos(r.min))}%" title="Rango objetivo ${r.min}-${r.max}%"></div>` : ''}
          <div class="rb-bar ${st}" style="width:${pos(r.actual || 0)}%"></div>
          ${r.target != null ? `<div class="rb-target" style="left:${pos(r.target)}%" title="Ejemplo de mezcla ${r.target}%"></div>` : ''}
        </div>
        <div class="rb-v ${st}">${(r.actual || 0).toFixed(1)}%</div></div>`;
      })
      .join('')}
      <div class="rb-key"><span><i class="k-range"></i>rango objetivo</span><span><i class="k-target"></i>mezcla de ejemplo</span><span><i class="k-bar"></i>hoy</span></div></div>`;
  };

  /** Barras simples horizontales. rows: [{label, value, color}] */
  App.hbars = (rows, fmt) => {
    const mx = Math.max(...rows.map((r) => Math.abs(r.value)), 1e-9);
    return `<div class="rbars">${rows
      .map(
        (r, i) => `<div class="rb-row"><div class="rb-l">${esc(r.label)}</div>
      <div class="rb-track"><div class="rb-bar" style="width:${(Math.abs(r.value) / mx) * 100}%;background:${r.color || App.colorFor(i)}"></div></div>
      <div class="rb-v">${fmt ? fmt(r.value) : r.value}</div></div>`
      )
      .join('')}</div>`;
  };

  /** Línea simple (SVG). points: [{x:label, y:number}] */
  App.lineChart = (points, fmt) => {
    if (points.length < 2) return `<div class="empty small">Se necesitan al menos 2 puntos</div>`;
    const W = 600, H = 180, pad = 28;
    const ys = points.map((p) => p.y);
    const mn = Math.min(0, ...ys), mx = Math.max(...ys) * 1.05 || 1;
    const X = (i) => pad + (i / (points.length - 1)) * (W - pad * 2);
    const Y = (v) => H - pad - ((v - mn) / (mx - mn || 1)) * (H - pad * 2);
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
    const area = `${d} L${X(points.length - 1)} ${H - pad} L${X(0)} ${H - pad} Z`;
    return `<svg viewBox="0 0 ${W} ${H}" class="line" role="img">
      <path d="${area}" class="line-area"/><path d="${d}" class="line-p"/>
      ${points.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.y)}" r="3"><title>${esc(p.x)}: ${fmt ? fmt(p.y) : p.y}</title></circle>`).join('')}
      <text x="${pad}" y="${H - 8}" class="ax">${esc(points[0].x)}</text>
      <text x="${W - pad}" y="${H - 8}" text-anchor="end" class="ax">${esc(points[points.length - 1].x)}</text></svg>`;
  };
})(window);
