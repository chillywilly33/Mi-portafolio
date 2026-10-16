/* Utilidades generales: DOM, formato, modal, toast.  Todo cuelga de window.App */
(function (g) {
  const App = (g.App = g.App || { views: {} });

  App.$ = (s, r = document) => r.querySelector(s);
  App.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  App.esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  App.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  App.today = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  App.daysUntil = (iso) => {
    if (!iso) return null;
    const a = new Date(App.today() + 'T00:00:00');
    const b = new Date(iso + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  };

  /* ---------- formato de dinero ---------- */
  // Internamente TODO se guarda en USD. Solo al mostrar se convierte a MXN si así se eligió.
  App.fx = () => Number(App.Store.state.settings.fx) || 1;
  App.display = () => App.Store.state.settings.display || 'MXN';
  App.fmtCur = (n, cur, dec) => {
    if (n == null || !isFinite(n)) return '—';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: dec ?? 2,
      maximumFractionDigits: dec ?? 2,
    }).format(n);
  };
  App.usd = (n, dec) => App.fmtCur(n, 'USD', dec);
  App.mxn = (n, dec) => App.fmtCur(n, 'MXN', dec);
  // Muestra un monto en USD en la divisa elegida por el usuario
  App.money = (usd, dec) => {
    if (usd == null || !isFinite(usd)) return '—';
    return App.display() === 'MXN' ? App.mxn(usd * App.fx(), dec ?? 0) : App.usd(usd, dec ?? 2);
  };
  App.pct = (n, d = 1) => (n == null || !isFinite(n) ? '—' : n.toFixed(d) + '%');
  App.signed = (n, d = 1) => (n == null || !isFinite(n) ? '—' : (n > 0 ? '+' : '') + n.toFixed(d) + '%');
  App.num = (n, d = 4) =>
    n == null || !isFinite(n) ? '—' : new Intl.NumberFormat('es-MX', { maximumFractionDigits: d }).format(n);
  App.fmtDate = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  /* ---------- toast ---------- */
  App.toast = (msg, kind) => {
    let box = App.$('#toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toasts';
      document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3700);
  };

  /* ---------- modal ---------- */
  // App.modal({title, body, actions:[{label, primary, danger, onClick(close)->false para no cerrar}], onOpen(el, close), wide})
  App.modal = (opt) => {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="modal ${opt.wide ? 'wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal-h"><h3>${App.esc(opt.title || '')}</h3><button class="icon-btn" data-x aria-label="Cerrar">✕</button></div>
        <div class="modal-b">${opt.body || ''}</div>
        <div class="modal-f"></div></div>`;
    document.body.appendChild(ov);
    const close = () => {
      ov.remove();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    ov.addEventListener('mousedown', (e) => e.target === ov && close());
    App.$('[data-x]', ov).onclick = close;
    const foot = App.$('.modal-f', ov);
    (opt.actions || [{ label: 'Cerrar' }]).forEach((a) => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.primary ? 'primary' : a.danger ? 'danger' : '');
      b.textContent = a.label;
      b.onclick = () => {
        if (!a.onClick || a.onClick(close, ov) !== false) close();
      };
      foot.appendChild(b);
    });
    opt.onOpen && opt.onOpen(ov, close);
    const first = App.$('input,select,textarea', ov);
    first && first.focus();
    return close;
  };
  App.confirm = (msg, onYes, label = 'Sí, continuar') =>
    App.modal({
      title: 'Confirmar',
      body: `<p>${App.esc(msg)}</p>`,
      actions: [{ label: 'Cancelar' }, { label, danger: true, onClick: () => onYes() }],
    });

  /* ---------- helpers de formularios ---------- */
  App.field = (label, inner, hint) =>
    `<label class="field"><span>${label}</span>${inner}${hint ? `<small>${hint}</small>` : ''}</label>`;
  App.options = (list, sel) =>
    list.map((o) => {
      const v = typeof o === 'object' ? o.v : o;
      const l = typeof o === 'object' ? o.l : o;
      return `<option value="${App.esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${App.esc(l)}</option>`;
    }).join('');

  App.download = (filename, text, mime = 'application/json') => {
    const blob = new Blob([text], { type: mime + ';charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  };
})(window);
