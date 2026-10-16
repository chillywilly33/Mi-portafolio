// Pruebas de la lógica de cálculo. Ejecuta: node tests/calc.test.js
const assert = require('assert');
const Calc = require('../src/js/calc.js');
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≉ ${b}`);

// --- Libro de movimientos ---
const mv = [
  { type: 'deposito', date: '2026-01-01', amount: 1000, currency: 'USD', fx: 18 },
  { type: 'compra', date: '2026-01-02', ticker: 'AAA', qty: 4, price: 100, fees: 1 },   // costo 401
  { type: 'compra', date: '2026-01-03', ticker: 'AAA', qty: 4, price: 120, fees: 0 },   // costo 480 → total 881, 8 acc
  { type: 'venta', date: '2026-01-04', ticker: 'AAA', qty: 2, price: 150, fees: 0 },    // promedio 110.125; realizada 300-220.25
  { type: 'dividendo', date: '2026-01-05', ticker: 'AAA', amount: 10, currency: 'USD' },
  { type: 'deposito', date: '2026-01-06', amount: 1800, currency: 'MXN', fx: 18 },      // +100 USD
  { type: 'retiro', date: '2026-01-07', amount: 50, currency: 'USD' },
  { type: 'compra', date: '2026-01-08', ticker: 'OLD', qty: 1, price: 50, affectsCash: false },
];
const L = Calc.computeLedger(mv, 18);
near(L.positions.AAA.qty, 6);
near(L.positions.AAA.cost, 881 * 6 / 8);
near(L.realized, 300 - 110.125 * 2);
near(L.dividends, 10);
// efectivo: 1000 -401 -480 +300 +10 +100 -50 = 479 (OLD no afecta)
near(L.cash, 479);
assert.strictEqual(Calc.computeLedger([{ type: 'venta', date: '2026-01-01', ticker: 'X', qty: 1, price: 1 }], 18).issues.length, 1);

// --- Resumen ---
const state = {
  settings: { fx: 18, vooTechPct: 30, caps: { position: 15, sector: 40, cashMin: 5, cashMax: 15 }, targets: [{ block: 'ETF base', min: 45, max: 55 }] },
  securities: {
    VOO: { sector: 'ETF base', type: 'etf', price: 100 }, NVDA: { sector: 'Tecnología', price: 50 },
  },
  movements: [
    { type: 'deposito', date: '2026-01-01', amount: 1000, currency: 'USD' },
    { type: 'compra', date: '2026-01-02', ticker: 'VOO', qty: 6, price: 100 },
    { type: 'compra', date: '2026-01-02', ticker: 'NVDA', qty: 4, price: 50 },
  ],
};
const S = Calc.summarize(state);
near(S.total, 1000); near(S.blockPct['ETF base'], 60); near(S.blockPct['Tecnología'], 20); near(S.blockPct['Efectivo'], 20);
near(S.techReal, 20 + 60 * 0.3);
// 3 posiciones iguales de 1/3 → 3 efectivas
const eq = Calc.summarize({ ...state, movements: [
  { type: 'deposito', date: '2026-01-01', amount: 300, currency: 'USD' },
  { type: 'compra', date: '2026-01-02', ticker: 'VOO', qty: 1, price: 100 }, { type: 'compra', date: '2026-01-02', ticker: 'NVDA', qty: 2, price: 50 } ] });
near(eq.effective, 3, 1e-6);
const alerts = Calc.checkRules(S, state.settings);
assert.ok(alerts.some((a) => /ETF base/.test(a.text)), 'ETF base arriba del rango debe avisar');

// --- Calculadora de compra (ejemplo de la guía: SPOT 8% en 4 compras de ~2%) ---
const p = Calc.planPurchase({ total: 10000, pct: 8, existingValue: 500, subtractExisting: false, n: 4, price: 650, sectorValue: 2900, sector: 'Tecnología', sectorCap: 40, positionCap: 15, cash: 1000 });
near(p.targetAmt, 800); near(p.toBuy, 800); near(p.tranches[0].amount, 200); near(p.tranches[0].qty, 200 / 650);
assert.ok(p.warnings.length === 0, JSON.stringify(p.warnings));
const p2 = Calc.planPurchase({ total: 10000, pct: 8, existingValue: 500, subtractExisting: true, n: 2, price: 650, sectorValue: 2900, sector: 'Tecnología', sectorCap: 40, positionCap: 15, cash: 100 });
near(p2.toBuy, 300); assert.ok(p2.warnings.some((w) => /necesitas/i.test(w.text)), 'sin efectivo suficiente debe avisar');
const p3 = Calc.planPurchase({ total: 10000, pct: 20, existingValue: 0, n: 3, price: 10, sectorValue: 3000, sector: 'Tecnología', sectorCap: 40, positionCap: 15, cash: 5000 });
assert.ok(p3.warnings.some((w) => /tope individual/.test(w.text)));
const p4 = Calc.planPurchase({ total: 10000, pct: 10, existingValue: 0, n: 3, shares: [50, 30, 30], price: 10, sectorValue: 3500, sector: 'Tecnología', sectorCap: 40, positionCap: 15, cash: 5000 });
assert.ok(p4.warnings.some((w) => /suman 110/.test(w.text)) && p4.warnings.some((w) => /sector/i.test(w.text)));
const p5 = Calc.planPurchase({ total: 10000, newMoney: 2000, pct: 5, n: 2, price: 100, sectorValue: 0, sector: 'Salud', sectorCap: 40, positionCap: 15, cash: 0 });
near(p5.base, 12000); near(p5.toBuy, 600); assert.strictEqual(p5.warnings.some((w) => /necesitas/i.test(w.text)), false);

// --- Filtro de 15 ---
const all = Array(15).fill(true);
assert.strictEqual(Calc.score(all).level, 'high');
const f4 = all.slice(); f4[0] = false; assert.strictEqual(Calc.score(f4).passes, 4); assert.strictEqual(Calc.score(f4).level, 'mid');
const f2 = Array(15).fill(false).map((_, i) => i < 6); assert.strictEqual(Calc.score(f2).passes, 2); assert.strictEqual(Calc.score(f2).level, 'low');
assert.strictEqual(Calc.score(Array(15).fill(null)).level, 'none');
console.log('OK: todas las pruebas de calc.js pasaron');
