/* Vista: Noticias (Financial Modeling Prep + Alpha Vantage). */
(function (g) {
  const App = g.App;
  const { esc } = App;
  const O = { src: 'both', scope: 'mine', ticker: '', q: '', loading: false, errs: [] };

  const SENT = (s) => (!s ? '' : { Bullish: 'pos', 'Somewhat-Bullish': 'pos', Bearish: 'neg', 'Somewhat-Bearish': 'neg' }[s.label] || '');
  const SENT_ES = { Bullish: 'Alcista', 'Somewhat-Bullish': 'Algo alcista', Neutral: 'Neutral', 'Somewhat-Bearish': 'Algo bajista', Bearish: 'Bajista' };

  function myTickers() {
    const st = App.Store.state, sum = Calc.summarize(st);
    const held = sum.rows.filter((r) => r.sector !== 'ETF base').map((r) => r.ticker);
    const radar = Object.entries(st.theses).filter(([k, t]) => ['radar', 'analizada'].includes(t.status) && /^[A-Z]{1,5}$/.test(k)).map(([k]) => k);
    return Array.from(new Set([...held, ...radar])).slice(0, 10);
  }

  async function load() {
    O.loading = true; O.errs = []; App.refresh();
    const tickers = O.scope === 'mine' ? myTickers() : O.scope === 'one' ? [O.ticker.toUpperCase()].filter(Boolean) : [];
    if (O.scope === 'one' && !tickers.length) { O.loading = false; O.errs.push('Escribe un ticker.'); return App.refresh(); }
    const jobs = [];
    if (O.src !== 'av') jobs.push(App.API.newsFMP({ tickers }).catch((e) => { O.errs.push('FMP: ' + e.message); return []; }));
    if (O.src !== 'fmp') jobs.push(App.API.newsAV({ tickers, topics: O.scope === 'general' ? 'financial_markets,economy_macro' : undefined }).catch((e) => { O.errs.push('Alpha Vantage: ' + e.message); return []; }));
    const res = (await Promise.all(jobs)).flat();
    const seen = new Set();
    const items = res.filter((n) => n.title && !seen.has(n.title) && seen.add(n.title)).sort((a, b) => (b.time || '').localeCompare(a.time || '')).slice(0, 80);
    if (items.length) App.Store.set((s) => (s.news = { items, fetched: new Date().toISOString(), scope: O.scope }));
    O.loading = false; App.refresh();
  }

  App.views.noticias = {
    title: 'Noticias',
    render(el) {
      const st = App.Store.state, n = st.news || { items: [] };
      const f = O.q.toLowerCase();
      const items = (n.items || []).filter((x) => !f || (x.title + ' ' + x.summary + ' ' + x.tickers.join(' ')).toLowerCase().includes(f));
      const noKeys = !st.settings.fmpKey && !st.settings.avKey;
      el.innerHTML = `
      <div class="card"><div class="row gap wrap end">
        ${App.field('Fuente', `<select id="n-src">${App.options([{ v: 'both', l: 'FMP + Alpha Vantage' }, { v: 'fmp', l: 'Financial Modeling Prep' }, { v: 'av', l: 'Alpha Vantage (con sentimiento)' }], O.src)}</select>`)}
        ${App.field('Alcance', `<select id="n-scope">${App.options([{ v: 'mine', l: 'Mis acciones y radar' }, { v: 'one', l: 'Un ticker' }, { v: 'general', l: 'Mercado en general' }], O.scope)}</select>`)}
        ${O.scope === 'one' ? App.field('Ticker', `<input id="n-tk" value="${esc(O.ticker)}" placeholder="NVDA" style="width:110px" autocapitalize="characters">`) : ''}
        <button class="btn primary" id="n-go" ${O.loading ? 'disabled' : ''}>${O.loading ? 'Buscando…' : '↻ Buscar noticias'}</button></div>
        ${O.scope === 'mine' ? `<p class="muted sm">Buscará: ${esc(myTickers().join(', ') || 'aún no tienes acciones — se usará el mercado general')}</p>` : ''}
        ${noKeys ? '<div class="banner warn">Falta tu clave de API. Agrégala en Ajustes.</div>' : ''}
        ${O.errs.length ? `<ul class="alerts">${O.errs.map((e) => `<li class="warn">${esc(e)}</li>`).join('')}</ul>` : ''}</div>
      <div class="row between wrap gap"><input id="n-q" type="search" placeholder="Filtrar resultados…" value="${esc(O.q)}"><small class="muted">${n.fetched ? 'Última búsqueda: ' + new Date(n.fetched).toLocaleString('es-MX') : 'Aún no has buscado noticias'} · ${items.length} resultados</small></div>
      <div class="news">${items.length ? items.map((x) => `<article class="card nitem">
        ${x.image ? `<img src="${esc(x.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
        <div><div class="meta"><span class="chip">${esc(x.provider)}</span><b>${esc(x.source)}</b><small>${x.time ? new Date(x.time).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</small>
          ${x.sentiment ? `<span class="chip ${SENT(x.sentiment)}">${esc(SENT_ES[x.sentiment.label] || x.sentiment.label)} ${x.sentiment.score.toFixed(2)}</span>` : ''}</div>
        <h4><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.title)}</a></h4>
        <p>${esc((x.summary || '').slice(0, 240))}${(x.summary || '').length > 240 ? '…' : ''}</p>
        <div>${x.tickers.map((t) => `<a class="chip link" href="#/tesis/${encodeURIComponent(t)}">${esc(t)}</a>`).join(' ')}</div></div></article>`).join('') : `<div class="card empty">${O.loading ? 'Cargando…' : 'Pulsa “Buscar noticias” para traerlas.'}</div>`}</div>
      <p class="muted sm">Antes de actuar por una noticia, repasa tu tesis: el ruido de una noticia no es razón para vender.</p>`;
      App.$('#n-src', el).onchange = (e) => { O.src = e.target.value; };
      App.$('#n-scope', el).onchange = (e) => { O.scope = e.target.value; App.refresh(); };
      const tk = App.$('#n-tk', el); if (tk) tk.oninput = (e) => (O.ticker = e.target.value);
      App.$('#n-go', el).onclick = load;
      App.$('#n-q', el).oninput = (e) => { O.q = e.target.value; const p = e.target.selectionStart; App.refresh(); const i = App.$('#n-q'); i.focus(); i.setSelectionRange(p, p); };
    },
  };
})(window);
