/* Vista: Glosario (buscable, por categoría; admite términos propios). */
(function (g) {
  const App = g.App;
  const { esc } = App;
  let q = '', cat = '';

  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  App.views.glosario = {
    title: 'Glosario',
    render(el) {
      const custom = App.Store.state.glossary || [];
      const all = [...App.GLOSSARY, ...custom.map((c) => ({ ...c, custom: true }))].sort((a, b) => a.t.localeCompare(b.t, 'es'));
      const cats = Array.from(new Set(all.map((x) => x.c)));
      el.innerHTML = `<div class="row between wrap gap">
        <div class="row gap wrap"><input id="g-q" type="search" placeholder="Buscar término (P/E, moat, ETF…)" value="${esc(q)}" style="min-width:260px">
          <select id="g-c"><option value="">Todas las categorías</option>${App.options(cats, cat)}</select></div>
        <button class="btn" id="g-add">+ Mi término</button></div>
        <div class="chips" id="g-az"></div><div id="g-list" class="gloss"></div>`;
      const paint = () => {
        const f = norm(q);
        const list = all.filter((x) => (!cat || x.c === cat) && (!f || norm(x.t + ' ' + x.alias + ' ' + x.d).includes(f)));
        const letters = Array.from(new Set(list.map((x) => norm(x.t)[0].toUpperCase())));
        App.$('#g-az', el).innerHTML = letters.map((l) => `<a href="#" data-l="${l}" class="chip link">${l}</a>`).join('');
        App.$('#g-list', el).innerHTML = list.length ? list.map((x) => `<article class="term" id="t-${norm(x.t)[0].toUpperCase()}-${norm(x.t).replace(/\W+/g, '')}" data-l="${norm(x.t)[0].toUpperCase()}"><div class="row between"><h4>${esc(x.t)}</h4><span class="chip">${esc(x.c)}</span></div><p>${esc(x.d)}</p>${x.alias ? `<small class="muted">También: ${esc(x.alias)}</small>` : ''}${x.custom ? `<button class="linkbtn" data-del="${esc(x.t)}">quitar</button>` : ''}</article>`).join('') : '<div class="empty">No encontré ese término. Puedes agregarlo con “+ Mi término”.</div>';
        App.$$('[data-del]', el).forEach((b) => (b.onclick = () => { App.Store.set((s) => (s.glossary = (s.glossary || []).filter((x) => x.t !== b.dataset.del))); App.refresh(); }));
        App.$$('#g-az a', el).forEach((a) => (a.onclick = (e) => { e.preventDefault(); const t = App.$(`.term[data-l="${a.dataset.l}"]`, el); t && t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
      };
      App.$('#g-q', el).oninput = (e) => { q = e.target.value; paint(); };
      App.$('#g-c', el).onchange = (e) => { cat = e.target.value; paint(); };
      App.$('#g-add', el).onclick = () => App.modal({
        title: 'Agregar término',
        body: App.field('Término', '<input id="gt-t">') + App.field('Categoría', `<select id="gt-c">${App.options([...cats, 'Mis términos'], 'Mis términos')}</select>`) + App.field('Significado', '<textarea id="gt-d" rows="3"></textarea>'),
        actions: [{ label: 'Cancelar' }, { label: 'Guardar', primary: true, onClick: (c, ov) => { const t = App.$('#gt-t', ov).value.trim(), d = App.$('#gt-d', ov).value.trim(); if (!t || !d) return false; App.Store.set((s) => { s.glossary = s.glossary || []; s.glossary.push({ t, c: App.$('#gt-c', ov).value, d, alias: '' }); }); App.refresh(); } }],
      });
      paint();
    },
  };
})(window);
