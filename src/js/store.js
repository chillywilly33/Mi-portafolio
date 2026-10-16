/* Capa de datos con ADAPTADORES.
 *
 *  Hoy: guarda en un archivo JSON (Electron) o en localStorage (navegador).
 *  Mañana: cambia el adaptador por RemoteAdapter (API + login) sin tocar ninguna pantalla,
 *  porque las vistas solo usan App.Store.state / App.Store.set() / App.Store.save().
 *  Ver docs/ROADMAP.md y db/schema.sql.
 */
(function (g) {
  const App = g.App;

  /* --- Adaptador Electron: archivo en la carpeta de datos del usuario --- */
  const ElectronAdapter = {
    name: 'archivo local (Electron)',
    async load() {
      const raw = await g.api.loadData();
      return raw ? JSON.parse(raw) : null;
    },
    async save(state) {
      await g.api.saveData(JSON.stringify(state));
    },
  };

  /* --- Adaptador navegador: localStorage --- */
  const KEY = 'mis-inversiones-v1';
  const LocalAdapter = {
    name: 'navegador (localStorage)',
    async load() {
      try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; }
    },
    async save(state) {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { App.toast('No se pudo guardar en el navegador', 'bad'); }
    },
  };

  /* --- FUTURO: adaptador remoto con inicio de sesión (esqueleto, aún sin usar) ---
  const RemoteAdapter = {
    name: 'servidor (API + login)',
    token: null,
    async login(email, password) { ... POST /auth/login → this.token },
    async load() { const r = await fetch(API + '/state', { headers: { Authorization: 'Bearer ' + this.token } }); return r.json(); },
    async save(state) { await fetch(API + '/state', { method: 'PUT', headers: {...}, body: JSON.stringify(state) }); },
  };
  ------------------------------------------------------------------------------- */

  function merge(base, extra) {
    // Completa claves nuevas de versiones futuras sin perder lo que ya guardó el usuario.
    if (Array.isArray(base) || typeof base !== 'object' || base === null) return extra === undefined ? base : extra;
    const out = { ...base };
    if (extra && typeof extra === 'object') for (const k of Object.keys(extra)) out[k] = k in base ? merge(base[k], extra[k]) : extra[k];
    return out;
  }

  const Store = (App.Store = {
    state: null,
    adapter: null,
    timer: null,
    async init() {
      this.adapter = g.api && g.api.loadData ? ElectronAdapter : LocalAdapter;
      let saved = null;
      try { saved = await this.adapter.load(); } catch (e) { console.error('No se pudo leer los datos', e); }
      const def = App.defaultState();
      this.state = saved ? merge(def, saved) : def;
      // Arreglos que no deben fusionarse con los valores por defecto:
      if (saved) ['movements', 'plans', 'reports', 'guide', 'journal'].forEach((k) => saved[k] && (this.state[k] = saved[k]));
      if (saved && saved.settings && saved.settings.targets) this.state.settings.targets = saved.settings.targets;
      if (saved && saved.securities) this.state.securities = saved.securities;
      if (saved && saved.theses) this.state.theses = saved.theses;
      if (!saved) this.save(true);
    },
    set(fn) { fn(this.state); this.save(); },
    save(now) {
      clearTimeout(this.timer);
      const run = () => this.adapter.save(this.state);
      if (now) run(); else this.timer = setTimeout(run, 250);
    },
    replace(newState) {
      this.state = merge(App.defaultState(), newState);
      ['movements', 'plans', 'reports', 'guide', 'journal', 'securities', 'theses'].forEach((k) => newState[k] && (this.state[k] = newState[k]));
      if (newState.settings && newState.settings.targets) this.state.settings.targets = newState.settings.targets;
      this.save(true);
    },
  });
})(window);
