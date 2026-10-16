/* Datos base: tu guía de inversión convertida en datos, glosario y estado inicial. */
(function (g) {
  const App = g.App;
  const CFG = g.APP_CONFIG || {};

  App.SECTORS = ['ETF base', 'Tecnología', 'Financiero', 'Salud', 'Consumo', 'Cripto', 'Energía', 'Industrial', 'Otro'];

  App.STATUS = {
    comprada_tesis: { l: 'Comprada con tesis', c: 'ok' },
    comprada_antes: { l: 'Comprada antes del método', c: 'mid' },
    analizada: { l: 'Analizada, por decidir', c: 'info' },
    radar: { l: 'En el radar', c: 'info' },
    descartada: { l: 'Descartada', c: 'low' },
    fuera: { l: 'Fuera por ahora', c: 'low' },
  };

  App.MOVE_TYPES = { compra: 'Compra', venta: 'Venta', dividendo: 'Dividendo', deposito: 'Depósito', retiro: 'Retiro' };

  /* ---- Las 4 preguntas ---- */
  App.Q4 = [
    { k: 'q1', t: '1. ¿De qué vive la empresa?', h: 'La explico en 3 líneas y sé de dónde sale el 80% de sus ingresos.' },
    { k: 'q2', t: '2. ¿Cuál es su moat?', h: 'Qué le impide a un competidor copiarla mañana: marca, escala, costo de cambio, efecto de red, regulación.' },
    { k: 'q3', t: '3. ¿Cómo va su crecimiento?', h: 'Ingresos, usuarios, márgenes: ¿acelera o frena?' },
    { k: 'q4', t: '4. ¿Cuáles son los riesgos?', h: 'Del negocio, del precio y del entorno macro o geopolítico.' },
  ];

  /* ---- El filtro de 15 preguntas (5 filtros × 3) ---- */
  App.FILTERS = [
    { n: 'Modelo de negocio', q: [
      'Puedo explicarlo sin jerga.',
      'Sé de dónde sale el 80% de sus ingresos.',
      'Entiendo por qué el cliente le paga a ella.'] },
    { n: 'Salud financiera', q: [
      'Margen operativo alto para su sector (referencia: arriba de 15%).',
      'Deuda neta menor a 3 veces su EBITDA.',
      'Flujo de caja libre positivo y creciente.'] },
    { n: 'Ventaja competitiva', q: [
      'Tiene al menos un moat claro.',
      'Lleva 5-10 años (no es moda).',
      'Puedo nombrar a quien intentó copiarla y no pudo.'] },
    { n: 'Valuación justa', q: [
      'Su P/E no está más de 25% arriba de su promedio de 5 años.',
      'Es razonable contra su sector y el crecimiento esperado.',
      'El crecimiento esperado se sostiene sin el evento estrella.'] },
    { n: 'Encaje en mi portafolio', q: [
      'Me da un sector o región que no tengo.',
      'Ninguna posición pasa de 15%.',
      'Ningún sector pasa de 40%.'] },
  ];

  /* ---- Guía editable (texto de tu documento). “- ” = viñeta, “1. ” = lista numerada ---- */
  App.GUIDE_DEFAULT = [
    { id: 'principios', title: '1. Los principios (lo que no cambia)', body:
`- Solo invierto en negocios que entiendo (mi círculo de competencia).
- Decido con reglas escritas antes de actuar, no con emoción ni por la noticia del día.
- Mi horizonte es de 5 años o más y tolero caídas de 20-30%, porque es dinero que no necesito pronto.
- No vendo por pánico. Si una posición pesa demasiado, prefiero diluirla comprando otras cosas.
- Una ganancia, por sí sola, no es razón para vender. Una caída, por sí sola, no es razón para comprar.
- No hago trading de corto plazo, ni opciones, ni apalancamiento.` },
    { id: 'resultado', title: 'Cómo leer el resultado del filtro', body:
`- 5 de 5: convicción alta.
- 3 o 4 de 5: buena empresa con matices; posición normal o chica y vigilar los puntos que fallaron.
- 0 a 2 de 5: no comprar todavía (así quedaron BBB Foods y Mattel con 2 de 5).
- Una buena empresa no siempre es una buena compra: el precio cuenta (Vita Coco pasó 3 de 5 por su valuación).` },
    { id: 'macro', title: '3. Señales macro para soltar efectivo (mi semáforo)', body:
`No es una predicción, es una condición:
- El Treasury a 10 años baja de ~4.75% y se sostiene 3-5 días.
- El petróleo Brent baja de ~$95 y se sostiene.
- El tono de la Fed: una subida puntual no es lo mismo que el inicio de un ciclo nuevo de alzas.
- Una acción de calidad cae 15-20% sin que el negocio se deteriore.
Estado a inicios de octubre de 2026: la Fed subió tasas el 16 de septiembre (la primera desde 2023) y dejó abierta otra subida; el Treasury anda cerca de 5% y el petróleo cerca de $100. Un solo día verde no cuenta: sigo esperando señales sostenidas.` },
    { id: 'como', title: 'Cómo compro (siempre escalonado)', body:
`1. Defino el % objetivo de la posición (según mi convicción y mi diversificación).
2. Paso el filtro de 15 y reviso el calendario de reportes.
3. Calculo el monto: % objetivo × valor total de mi portafolio. Lo recalculo cada vez que compro. (→ Calculadora)
4. Lo divido en 2 a 4 compras de 25-33% cada una, y cada compra tiene su condición (un reporte, una fecha o una caída real).
5. Antes de comprar defino por escrito mis reglas de venta.
6. Registro la compra: fecha, cantidad, precio, tipo de cambio y por qué compré. (→ Movimientos)` },
    { id: 'plan', title: 'Reglas por posición (mi plan)', body:
`- SPOT: 8% del portafolio en 4 compras de ~2%; vigilar su reporte del 22 de octubre.
- NVDA: 8% en 2 compras de 4%; la segunda condicionada a lo que digan Microsoft, Meta, Google y Amazon sobre su gasto en IA a fines de octubre.
- AXP: posición nueva; si compro más, escalonado y después de su reporte del 23 de octubre.
- Ideas pendientes (aún sin comprar): Alcon, Reddit, Deckers, Vita Coco, Mattel y Visa/Mastercard.` },
    { id: 'nocompro', title: 'Cuándo NO compro', body:
`- Para perseguir un rebote o porque «ya subió mucho».
- Si no entiendo el negocio o no pasa el filtro.
- Con dinero que puedo necesitar pronto o que es de mis deudas o gastos básicos.
- Justo antes de un reporte importante, si puedo esperar a ver los números.` },
    { id: 'vender_parte', title: '4. Vender una parte (20-30%) si…', body:
`- La posición crece tanto que pasa de 15% del portafolio, o su sector pasa de 40%.
- El precio sube muy por arriba del precio objetivo de consenso sin que las ganancias crezcan igual.
- La tesis se debilita (el filtro baja de 3 filtros a menos de 3).` },
    { id: 'vender_todo', title: 'Vender todo, solo si se juntan 2 o más de estas', body:
`- El negocio se deteriora de fondo: crecimiento por debajo de ~4-5% durante 2 trimestres seguidos, en una empresa que debería crecer más.
- La deuda se dispara hasta niveles que ya no se ven manejables.
- Mala ejecución repetida (productos que fracasan, recortes de meta una y otra vez).
- Pierde participación de mercado en su negocio principal.
- Se materializa el riesgo central de mi tesis (por ejemplo, que los gigantes de la nube corten su gasto en IA de golpe, en el caso de NVDA).` },
    { id: 'no_vender', title: 'Cosas que NO son razón para vender', body:
`- Una ganancia, por grande que sea (META subió más de 25% y no es motivo por sí sola).
- Una caída de un día o una semana sin noticia propia de la empresa.
- El miedo o el ruido de una noticia. Antes de vender, repaso mi tesis.` },
    { id: 'topes', title: '5. Cuánto de cada cosa (topes)', body:
`Marco de referencia hecho con mis propias reglas. Lo ajusto con el tiempo; no es una orden.
- Convicción alta: hasta 8% (SPOT y NVDA).
- Posición normal: 3-6%.
- Apuesta chica o especulativa (empresas pequeñas): 2-3%.
- Máximo absoluto de una posición individual: 15%. El ETF base no cuenta para este tope.
- Máximo de un sector: 40%.
- Ojo: el ETF ya trae mucha tecnología por dentro, así que mi exposición real a tecnología es mayor que el número de la tabla.` },
    { id: 'entorno', title: '6. El entorno (la cadena que mueve las acciones)', body:
`Petróleo caro, inflación que no baja, la Fed sube tasas, el rendimiento del Treasury sube y las acciones caras (sobre todo las de crecimiento, como las de IA) pierden atractivo. Por eso vigilo Fed, Treasury y petróleo.
- Geopolítica: el riesgo de Asia y los aranceles pesaron para descartar a Honda y a CFMoto.
- IA: gasto enorme de las grandes tecnológicas; vigilo si se sostiene y que no sea demanda financiada en círculo.
- Tipo de cambio: mis acciones valen dólares; mi ganancia en pesos también se mueve con el dólar.` },
    { id: 'vigilar', title: 'Qué vigilar de cada posición', body:
`- SPOT: suscriptores, margen, poder de las disqueras y que el precio no deja margen de error.
- NVDA: gasto en IA de los grandes clientes, margen bruto y el financiamiento circular.
- AXP: impagos y provisiones de crédito, regulación de capital y el miedo a despidos por IA en su cliente.
- META: gasto de capital, margen operativo y regulación sobre menores.
- GOOGL: regulación antimonopolio y cómo la IA cambia la búsqueda.
- VOO: es mi ancla; vigilar que no pese más del objetivo.` },
    { id: 'donde', title: 'Dónde y cómo compro', body:
`- Solo acciones y ETFs que cotizan en NYSE o Nasdaq. Los que solo existen como ADR en OTC (BMW, Adidas, Yamaha) tienen poca liquidez y a veces no aparecen en mi app.
- Las compras fraccionarias con orden límite duran solo 1 día; con montos chicos conviene comprar directo.
- Las órdenes se ejecutan en horario de mercado (7:30 a.m. hora de Ciudad de México, de lunes a viernes). Las de fin de semana se ejecutan el lunes.
- Pendiente: revisar con un contador cómo se declaran las ganancias y dividendos de acciones extranjeras.` },
  ];

  App.CHECK_BEFORE = [
    'Pasé las 4 preguntas y el filtro de 15 (tabla de resultado anotada).',
    'Sé qué % objetivo tiene y cuánto es en pesos hoy.',
    'Revisé el calendario de reportes y el semáforo macro.',
    'Dividí la compra en partes y cada una tiene condición.',
    'Escribí mis reglas de venta antes de comprar.',
    'El dinero no lo necesito pronto ni es de mis gastos o deudas.',
  ];
  App.CHECK_AFTER = [
    '¿Se cumplió lo que esperaba de la tesis?',
    '¿Cambió el resultado del filtro de 15?',
    '¿Alguna señal de venta se activó (parcial o total)?',
    '¿Sigo dentro de mis topes de posición y sector?',
    'Actualicé mi panel (movimientos, precios y tesis).',
  ];

  /* ---- Empresas / valores conocidos ---- */
  const SEC = {
    VOO: ['Vanguard S&P 500 ETF', 'ETF base', 'etf'],
    META: ['Meta Platforms', 'Tecnología'], GOOGL: ['Alphabet (Google)', 'Tecnología'],
    SPOT: ['Spotify', 'Tecnología'], NVDA: ['NVIDIA', 'Tecnología'], AXP: ['American Express', 'Financiero'],
    V: ['Visa', 'Financiero'], MA: ['Mastercard', 'Financiero'], ALC: ['Alcon', 'Salud'],
    RDDT: ['Reddit', 'Tecnología'], DECK: ['Deckers Brands', 'Consumo'], COCO: ['Vita Coco', 'Consumo'],
    MAT: ['Mattel', 'Consumo'], TBBB: ['BBB Foods', 'Consumo'], HMC: ['Honda', 'Industrial'],
    PUMSY: ['Puma (ADR OTC)', 'Consumo'],
  };

  const T = (o) => Object.assign({ status: 'analizada', sector: 'Otro', targetPct: null, conviction: '', q1: '', q2: '', q3: '', q4: '',
    filters: Array(15).fill(null), priorScore: null, sellRules: '', watch: '', buyPlan: '', notes: '', nextReport: '' }, o);

  App.defaultTheses = () => ({
    SPOT: T({ name: 'Spotify', status: 'comprada_tesis', sector: 'Tecnología', targetPct: 8, conviction: 'alta',
      buyPlan: '8% del portafolio en 4 compras de ~2%; vigilar su reporte del 22 de octubre.',
      watch: 'Suscriptores, margen, poder de las disqueras y que el precio no deja margen de error.', nextReport: '2026-10-22' }),
    NVDA: T({ name: 'NVIDIA', status: 'comprada_tesis', sector: 'Tecnología', targetPct: 8, conviction: 'alta',
      buyPlan: '8% en 2 compras de 4%; la segunda condicionada a lo que digan Microsoft, Meta, Google y Amazon sobre su gasto en IA a fines de octubre.',
      sellRules: 'Riesgo central de la tesis: que los gigantes de la nube corten su gasto en IA de golpe.',
      watch: 'Gasto en IA de los grandes clientes, margen bruto y el financiamiento circular.', nextReport: '2026-11-17' }),
    AXP: T({ name: 'American Express', status: 'comprada_tesis', sector: 'Financiero',
      buyPlan: 'Posición nueva; si compro más, escalonado y después de su reporte del 23 de octubre.',
      watch: 'Impagos y provisiones de crédito, regulación de capital y el miedo a despidos por IA en su cliente.', nextReport: '2026-10-23' }),
    META: T({ name: 'Meta Platforms', status: 'comprada_antes', sector: 'Tecnología',
      watch: 'Gasto de capital, margen operativo y regulación sobre menores.',
      notes: 'Subió más de 25% y no es motivo de venta por sí sola.', nextReport: '2026-10-28' }),
    GOOGL: T({ name: 'Alphabet (Google)', status: 'comprada_antes', sector: 'Tecnología',
      watch: 'Regulación antimonopolio y cómo la IA cambia la búsqueda.', nextReport: '2026-10-27' }),
    VOO: T({ name: 'Vanguard S&P 500 ETF', status: 'comprada_antes', sector: 'ETF base',
      watch: 'Es mi ancla; vigilar que no pese más del objetivo (45-55%).' }),
    ALC: T({ name: 'Alcon', sector: 'Salud' }),
    RDDT: T({ name: 'Reddit', sector: 'Tecnología' }),
    DECK: T({ name: 'Deckers Brands', sector: 'Consumo' }),
    PUMSY: T({ name: 'Puma', sector: 'Consumo', notes: 'Solo ADR en OTC: poca liquidez (ver “Dónde y cómo compro”).' }),
    COCO: T({ name: 'Vita Coco', sector: 'Consumo', priorScore: 3, notes: 'Pasó 3 de 5 por su valuación. Una buena empresa no siempre es una buena compra: el precio cuenta.' }),
    MAT: T({ name: 'Mattel', sector: 'Consumo', priorScore: 2, notes: '2 de 5: no comprar todavía. Reporte estimado ~20 de octubre (por confirmar).' }),
    V: T({ name: 'Visa', status: 'radar', sector: 'Financiero' }),
    MA: T({ name: 'Mastercard', status: 'radar', sector: 'Financiero' }),
    HMC: T({ name: 'Honda', status: 'descartada', sector: 'Industrial', notes: 'Descartada por riesgo geopolítico de Asia y aranceles.' }),
    CFMOTO: T({ name: 'CFMoto', status: 'descartada', sector: 'Industrial', notes: 'No se puede comprar desde mi app. Riesgo de Asia y aranceles.' }),
    TBBB: T({ name: 'BBB Foods', status: 'descartada', sector: 'Consumo', priorScore: 2, notes: '2 de 5 filtros.' }),
    BANCOS: T({ name: 'Bancos tradicionales', status: 'fuera', sector: 'Financiero', notes: 'Fuera por ahora.' }),
  });

  App.defaultSecurities = () => {
    const s = {};
    Object.entries(SEC).forEach(([t, v]) => (s[t] = { ticker: t, name: v[0], sector: v[1], type: v[2] || 'stock', price: null, priceUpdated: null }));
    return s;
  };

  App.defaultReports = () => [
    { id: 'r1', ticker: 'MAT', date: '2026-10-20', when: 'estimado', note: 'Por confirmar', confirmed: false },
    { id: 'r2', ticker: 'SPOT', date: '2026-10-22', when: 'antes de la apertura', note: '', confirmed: true },
    { id: 'r3', ticker: 'AXP', date: '2026-10-23', when: '', note: '', confirmed: true },
    { id: 'r4', ticker: 'GOOGL', date: '2026-10-27', when: 'después del cierre', note: '', confirmed: true },
    { id: 'r5', ticker: 'META', date: '2026-10-28', when: 'después del cierre', note: '', confirmed: true },
    { id: 'r6', ticker: 'NVDA', date: '2026-11-17', when: '', note: '', confirmed: true },
  ];

  App.defaultPlans = () => [
    { id: 'p1', ticker: 'SPOT', pct: 8, n: 4, shares: [25, 25, 25, 25], conditions: ['Reporte del 22 de octubre', '', '', ''], done: [false, false, false, false] },
    { id: 'p2', ticker: 'NVDA', pct: 8, n: 2, shares: [50, 50], conditions: ['', 'Lo que digan MSFT, META, GOOGL y AMZN sobre su gasto en IA (fines de octubre)'], done: [false, false] },
  ];

  /* ---- Estado inicial ---- */
  App.defaultState = () => ({
    version: 1,
    settings: {
      name: '', display: 'MXN', fx: 18, fxUpdated: null, theme: 'auto',
      fmpKey: CFG.FMP_KEY || '', avKey: CFG.AV_KEY || '',
      vooTechPct: 30,
      caps: { position: 15, sector: 40, cashMin: 5, cashMax: 15 },
      macro: { treasury: 4.75, brent: 95 },
      targets: [
        { block: 'ETF base', min: 45, max: 55, ex: 50 },
        { block: 'Tecnología', min: 20, max: 30, ex: 25 },
        { block: 'Financiero', min: 5, max: 10, ex: 7 },
        { block: 'Salud', min: 5, max: 8, ex: 5 },
        { block: 'Consumo', min: 5, max: 8, ex: 5 },
        { block: 'Efectivo', min: 5, max: 15, ex: 8 },
        { block: 'Cripto', min: 0, max: 10, ex: null },
      ],
    },
    movements: [],
    securities: App.defaultSecurities(),
    theses: App.defaultTheses(),
    plans: App.defaultPlans(),
    reports: App.defaultReports(),
    macro: { treasury: 5.0, brent: 100, fed: 'sube', quality: false, updated: '2026-10-11' },
    guide: App.GUIDE_DEFAULT.map((g) => ({ ...g })),
    checks: { before: {}, after: {} },
    journal: [],
    news: { items: [], fetched: null },
    demo: false,
  });

  /* ---- Datos de ejemplo (FICTICIOS) para ver cómo luce la app. Se borran con un clic. ---- */
  App.demoData = () => {
    const d = (m, day) => `2026-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const mv = [];
    const add = (o) => mv.push(Object.assign({ id: App.uid(), fx: 18, fees: 0, affectsCash: true, reason: '', note: '', currency: 'USD', demo: true }, o));
    add({ date: d(3, 2), type: 'deposito', amount: 10000, reason: 'Depósito inicial (ejemplo)' });
    const buys = [
      ['VOO', d(3, 5), 11.2, 590, 'Ancla del portafolio'],
      ['META', d(5, 12), 1.9, 560, 'Comprada antes del método'],
      ['GOOGL', d(6, 3), 5.5, 195, 'Comprada antes del método'],
      ['SPOT', d(9, 20), 0.75, 650, 'Primera compra escalonada (2%)'],
      ['NVDA', d(9, 25), 1.6, 180, 'Primera compra (3%)'],
      ['AXP', d(10, 6), 1.2, 330, 'Posición nueva con tesis'],
    ];
    buys.forEach(([t, date, qty, price, why]) => add({ date, type: 'compra', ticker: t, qty, price, reason: why }));
    add({ date: d(9, 30), type: 'dividendo', ticker: 'VOO', amount: 22.4, reason: 'Dividendo trimestral (ejemplo)' });
    return {
      movements: mv,
      prices: { VOO: 600, META: 700, GOOGL: 210, SPOT: 660, NVDA: 185, AXP: 340 },
    };
  };
})(window);
