/* Datos de mercado y noticias: Financial Modeling Prep (FMP) y Alpha Vantage (AV).
 * En Electron las peticiones salen por el proceso principal (sin problemas de CORS);
 * en el navegador se usa fetch directo. */
(function (g) {
  const App = g.App;
  const CFG = g.APP_CONFIG || {};

  async function getJSON(url) {
    let text;
    if (g.api && g.api.httpGet) {
      const r = await g.api.httpGet(url);
      if (r.error) throw new Error(r.error);
      if (r.status >= 400) throw new Error(`HTTP ${r.status}: ${String(r.text).slice(0, 160)}`);
      text = r.text;
    } else {
      const r = await fetch(url);
      text = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 160)}`);
    }
    try { return JSON.parse(text); } catch (e) { throw new Error('Respuesta no válida: ' + text.slice(0, 120)); }
  }

  const keys = () => App.Store.state.settings;
  const fmp = (path, params = {}) => {
    const k = keys().fmpKey;
    if (!k) throw new Error('Falta la clave de FMP (Ajustes).');
    const q = new URLSearchParams({ ...params, apikey: k });
    return getJSON(`${CFG.FMP_BASE}/${path}?${q}`);
  };
  const av = (fn, params = {}) => {
    const k = keys().avKey;
    if (!k) throw new Error('Falta la clave de Alpha Vantage (Ajustes).');
    const q = new URLSearchParams({ function: fn, ...params, apikey: k });
    return getJSON(`${CFG.AV_BASE}?${q}`);
  };

  const API = (App.API = {});

  /** Precio de un símbolo. Intenta FMP y luego Alpha Vantage. */
  API.quote = async (sym) => {
    const errs = [];
    if (keys().fmpKey) {
      try {
        const r = await fmp('quote', { symbol: sym });
        const o = Array.isArray(r) ? r[0] : r;
        if (o && o.price != null) return { price: Number(o.price), change: o.changePercentage ?? o.changesPercentage ?? null, src: 'FMP' };
        errs.push('FMP: ' + (o && o['Error Message'] ? o['Error Message'] : 'sin datos para ' + sym));
      } catch (e) { errs.push('FMP: ' + e.message); }
    }
    if (keys().avKey) {
      try {
        const r = await av('GLOBAL_QUOTE', { symbol: sym });
        const q = r['Global Quote'];
        if (q && q['05. price']) return { price: Number(q['05. price']), change: parseFloat(q['10. change percent']), src: 'AV' };
        errs.push('AV: ' + (r.Note || r.Information || 'sin datos'));
      } catch (e) { errs.push('AV: ' + e.message); }
    }
    throw new Error(errs.join(' | ') || 'Configura una clave de API en Ajustes.');
  };

  /** Actualiza precios de varios tickers y guarda el resultado. Devuelve {ok, fail}. */
  API.refreshPrices = async (tickers) => {
    const ok = [], fail = [];
    await Promise.all(
      tickers.map(async (t) => {
        try {
          const q = await API.quote(t);
          App.Store.state.securities[t] = { ...(App.Store.state.securities[t] || { ticker: t, name: t, sector: 'Otro', type: 'stock' }), price: q.price, priceUpdated: new Date().toISOString(), src: q.src };
          ok.push(t);
        } catch (e) { fail.push(t + ' (' + e.message + ')'); }
      })
    );
    App.Store.save();
    return { ok, fail };
  };

  /** Tipo de cambio USD→MXN */
  API.usdmxn = async () => {
    const errs = [];
    if (keys().fmpKey) {
      try {
        const r = await fmp('quote', { symbol: 'USDMXN' });
        const o = Array.isArray(r) ? r[0] : r;
        if (o && o.price) return Number(o.price);
        errs.push('FMP sin datos');
      } catch (e) { errs.push(e.message); }
    }
    if (keys().avKey) {
      try {
        const r = await av('CURRENCY_EXCHANGE_RATE', { from_currency: 'USD', to_currency: 'MXN' });
        const v = r['Realtime Currency Exchange Rate'];
        if (v) return Number(v['5. Exchange Rate']);
        errs.push(r.Note || r.Information || 'AV sin datos');
      } catch (e) { errs.push(e.message); }
    }
    throw new Error(errs.join(' | ') || 'Configura una clave de API.');
  };

  /** Treasury 10 años (FMP) y Brent (FMP BZUSD). Devuelve lo que logre obtener. */
  API.macro = async () => {
    const out = {}, errs = [];
    if (keys().fmpKey) {
      try {
        const r = await fmp('treasury-rates');
        const o = Array.isArray(r) ? r[0] : r;
        if (o && o.year10 != null) out.treasury = Number(o.year10);
      } catch (e) { errs.push('Treasury: ' + e.message); }
      try {
        const r = await fmp('quote', { symbol: 'BZUSD' });
        const o = Array.isArray(r) ? r[0] : r;
        if (o && o.price != null) out.brent = Number(o.price);
      } catch (e) { errs.push('Brent: ' + e.message); }
    }
    if (out.treasury == null && keys().avKey) {
      try {
        const r = await av('TREASURY_YIELD', { interval: 'daily', maturity: '10year' });
        if (r.data && r.data[0]) out.treasury = Number(r.data[0].value);
      } catch (e) { errs.push('AV Treasury: ' + e.message); }
    }
    if (out.brent == null && keys().avKey) {
      try {
        const r = await av('BRENT', { interval: 'daily' });
        if (r.data && r.data[0]) out.brent = Number(r.data[0].value);
      } catch (e) { errs.push('AV Brent: ' + e.message); }
    }
    return { out, errs };
  };

  /* ---------- Noticias (normalizadas a un mismo formato) ---------- */
  // {title, url, source, site, summary, time (ISO), image, tickers:[], sentiment:{label,score}|null, provider}
  const iso = (s) => {
    if (!s) return '';
    if (/^\d{8}T\d{6}/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`;
    return String(s).replace(' ', 'T');
  };

  API.newsFMP = async ({ tickers, limit = 30 }) => {
    const r = tickers && tickers.length
      ? await fmp('news/stock', { symbols: tickers.join(','), limit })
      : await fmp('news/general-latest', { limit });
    if (!Array.isArray(r)) throw new Error(r['Error Message'] || 'FMP no devolvió noticias');
    return r.map((n) => ({
      title: n.title, url: n.url || n.link, source: n.publisher || n.site || 'FMP', summary: n.text || '',
      time: iso(n.publishedDate), image: n.image || '', tickers: n.symbol ? [n.symbol] : [], sentiment: null, provider: 'FMP',
    }));
  };

  API.newsAV = async ({ tickers, topics, limit = 30 }) => {
    const p = { limit, sort: 'LATEST' };
    if (tickers && tickers.length) p.tickers = tickers.join(',');
    if (topics) p.topics = topics;
    const r = await av('NEWS_SENTIMENT', p);
    if (!r.feed) throw new Error(r.Note || r.Information || r['Error Message'] || 'Alpha Vantage no devolvió noticias');
    return r.feed.map((n) => ({
      title: n.title, url: n.url, source: n.source, summary: n.summary || '', time: iso(n.time_published),
      image: n.banner_image || '', tickers: (n.ticker_sentiment || []).map((t) => t.ticker).slice(0, 6),
      sentiment: { label: n.overall_sentiment_label, score: Number(n.overall_sentiment_score) }, provider: 'Alpha Vantage',
    }));
  };
})(window);
