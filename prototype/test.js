'use strict';
/**
 * Chạy: node prototype/test.js
 *
 * Bộ test cho phần lõi. Trong dự án thật hãy dùng Vitest/Jest, nhưng nguyên tắc
 * giống hệt: LÕI TÍNH TOÁN PHẢI CÓ TEST. Sai 2 mm là hỏng cả lô nhôm — không
 * có chỗ cho "chắc là đúng".
 */

const assert = require('assert');
const { evalExpr, evalMm, variablesUsed } = require('./formula');
const { explodeDoor, explodeOrder } = require('./explode');
const { optimizeCutting, groupForCutting } = require('./optimize');
const { costDetailed, comparePricing } = require('./pricing');
const db = require('./data');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n      ${e.message}`); }
}
const group = (n) => console.log(`\n▌ ${n}`);

// ── Engine công thức ──────────────────────────────────────────────────────
group('Engine công thức');

test('phép tính cơ bản', () => {
  assert.strictEqual(evalExpr('1 + 2 * 3', {}), 7);
  assert.strictEqual(evalExpr('(1 + 2) * 3', {}), 9);
  assert.strictEqual(evalExpr('10 / 4', {}), 2.5);
  assert.strictEqual(evalExpr('-5 + 3', {}), -2);
});

test('biến', () => {
  assert.strictEqual(evalExpr('W - 2*Bk', { W: 1400, Bk: 55 }), 1290);
});

test('toán tử điều kiện — quy tắc số bản lề', () => {
  const expr = 'sash * (H >= 2000 ? 3 : 2)';
  assert.strictEqual(evalExpr(expr, { sash: 2, H: 1600 }), 4);
  assert.strictEqual(evalExpr(expr, { sash: 2, H: 2200 }), 6);
});

test('hàm min/max/ceil', () => {
  assert.strictEqual(evalExpr('max(1, 2)', {}), 2);
  assert.strictEqual(evalExpr('ceil(2.1)', {}), 3);
  assert.strictEqual(evalExpr('min(5, 3, 8)', {}), 3);
});

test('evalMm luôn trả mm nguyên', () => {
  assert.strictEqual(evalMm('1250 / 2', {}), 625);
  assert.strictEqual(evalMm('1251 / 2', {}), 626);
  assert.ok(Number.isInteger(evalMm('W / 3', { W: 1000 })));
});

test('biến thiếu báo lỗi rõ ràng, không trả NaN âm thầm', () => {
  assert.throws(() => evalExpr('W + XYZ', { W: 1 }), /XYZ/);
});

test('chặn được code độc — không phải eval', () => {
  assert.throws(() => evalExpr('process.exit(1)', {}));
  assert.throws(() => evalExpr('require("fs")', {}));
  assert.throws(() => evalExpr('this', {}));
});

test('chia cho 0 báo lỗi thay vì trả Infinity', () => {
  assert.throws(() => evalExpr('10 / 0', {}), /Chia cho 0/);
});

test('liệt kê biến dùng trong công thức', () => {
  const vars = variablesUsed('W - 2*Bk + 2*c - k').sort();
  assert.deepStrictEqual(vars, ['Bk', 'W', 'c', 'k']);
});

// ── Bóc tách ──────────────────────────────────────────────────────────────
group('Bóc tách bộ cửa');

const mq2c = explodeDoor({
  templateCode: 'MQ2C', widthMm: 1400, heightMm: 1600,
  quantity: 1, finishCode: 'GHI', glassCode: 'H595',
});

test('khung bao cắt 45° dài đúng bằng phủ bì', () => {
  const kn = mq2c.parts.find((p) => p.key === 'khung_ngang');
  const kd = mq2c.parts.find((p) => p.key === 'khung_dung');
  assert.strictEqual(kn.lengthMm, 1400);
  assert.strictEqual(kd.lengthMm, 1600);
});

test('cánh ngang mở quay 2 cánh = 625 mm', () => {
  // (1400 - 2*55 + 2*12 - 60 - 4) / 2 = 1250 / 2 = 625
  assert.strictEqual(mq2c.parts.find((p) => p.key === 'canh_ngang').lengthMm, 625);
});

test('cánh đứng = đố động = 1510 mm', () => {
  const cd = mq2c.parts.find((p) => p.key === 'canh_dung').lengthMm;
  const dd = mq2c.parts.find((p) => p.key === 'do_dong').lengthMm;
  assert.strictEqual(cd, 1510);
  assert.strictEqual(dd, 1510);
});

test('nẹp kính tính được từ chiều dài cánh (tham chiếu thanh trước)', () => {
  // canh_ngang 625 - 2*55 + 2*2 = 519
  assert.strictEqual(mq2c.parts.find((p) => p.key === 'nep_ngang').lengthMm, 519);
});

test('công thức tự nhất quán: tổng bề rộng khớp phủ bì', () => {
  const canhNgang = mq2c.parts.find((p) => p.key === 'canh_ngang').lengthMm;
  const c = db.systems.XINGFA55.constants;
  // 2 cánh + đố động + 2 khung bao - 2 phần chờm = phủ bì - khe hở
  const tong = canhNgang * 2 + c.Bd + 2 * c.Bk - 2 * c.c;
  assert.strictEqual(tong, 1400 - c.k);
});

test('mọi chiều dài là số nguyên dương', () => {
  for (const p of mq2c.parts) {
    assert.ok(Number.isInteger(p.lengthMm), `${p.label} không nguyên: ${p.lengthMm}`);
    assert.ok(p.lengthMm > 0, `${p.label} ≤ 0`);
  }
});

test('kính làm tròn LÊN theo bội số nhà cung cấp', () => {
  const g = mq2c.glass[0];
  assert.strictEqual(g.widthMm % 5, 0);
  assert.strictEqual(g.heightMm % 5, 0);
  // thô: 625 - 110 - 8 = 507 → làm tròn lên 510
  assert.strictEqual(g.widthMm, 510);
});

test('số lượng nhân đúng theo số bộ', () => {
  const x3 = explodeDoor({ ...{ templateCode: 'MQ2C', widthMm: 1400, heightMm: 1600, finishCode: 'GHI', glassCode: 'H595' }, quantity: 3 });
  const a = mq2c.parts.find((p) => p.key === 'canh_ngang');
  const b = x3.parts.find((p) => p.key === 'canh_ngang');
  assert.strictEqual(b.qty, a.qty * 3);
  assert.strictEqual(b.lengthMm, a.lengthMm); // chiều dài KHÔNG đổi theo số lượng
});

test('bản lề tăng khi cửa cao ≥ 2000 mm', () => {
  const thap = explodeDoor({ templateCode: 'MQ2C', widthMm: 1400, heightMm: 1600, quantity: 1, finishCode: 'GHI', glassCode: 'H595' });
  const cao  = explodeDoor({ templateCode: 'MQ2C', widthMm: 1400, heightMm: 2200, quantity: 1, finishCode: 'GHI', glassCode: 'H595' });
  assert.strictEqual(thap.hardware.find((h) => h.code === 'BANLE').qty, 4);
  assert.strictEqual(cao.hardware.find((h) => h.code === 'BANLE').qty, 6);
});

test('chặn kích thước vô lý', () => {
  assert.throws(() => explodeDoor({ templateCode: 'MQ2C', widthMm: 100, heightMm: 100, quantity: 1, finishCode: 'GHI', glassCode: 'H595' }), /quá nhỏ/);
  assert.throws(() => explodeDoor({ templateCode: 'MQ1C', widthMm: 1900, heightMm: 1600, quantity: 1, finishCode: 'GHI', glassCode: 'H595' }), /xệ bản lề/);
});

test('mã sai báo lỗi rõ ràng', () => {
  assert.throws(() => explodeDoor({ templateCode: 'KHONGCO', widthMm: 1000, heightMm: 1000, quantity: 1, finishCode: 'GHI', glassCode: 'H595' }), /mẫu cửa/);
});

// ── Tối ưu cắt ────────────────────────────────────────────────────────────
group('Tối ưu cắt phôi');

test('trường hợp vừa khít: 2 đoạn 2900 vào 1 cây 5850', () => {
  const p = optimizeCutting([{ lengthMm: 2900, qty: 2, label: 'x' }], { stockLengthMm: 5850, kerfMm: 4 });
  assert.strictEqual(p.barsUsed, 1);
});

test('không nhồi quá dung lượng cây', () => {
  const p = optimizeCutting([{ lengthMm: 2000, qty: 9, label: 'x' }], { stockLengthMm: 5850, kerfMm: 4 });
  for (const bar of p.bars) {
    const used = bar.pieces.reduce((s, x) => s + x.lengthMm + 4, 0);
    assert.ok(used <= 5850, `cây ${bar.index} dùng ${used} > 5850`);
  }
});

test('không mất đoạn nào', () => {
  const demands = [
    { lengthMm: 1400, qty: 6, label: 'a' },
    { lengthMm: 1600, qty: 6, label: 'b' },
    { lengthMm:  625, qty: 12, label: 'c' },
    { lengthMm: 1510, qty: 12, label: 'd' },
  ];
  const p = optimizeCutting(demands, { stockLengthMm: 5850, kerfMm: 4 });
  const total = p.bars.reduce((s, b) => s + b.pieces.length, 0);
  assert.strictEqual(total, 6 + 6 + 12 + 12);
});

test('kết quả tất định — chạy lại cho cùng phương án', () => {
  const d = [{ lengthMm: 1234, qty: 17, label: 'x' }, { lengthMm: 987, qty: 23, label: 'y' }];
  const a = optimizeCutting(d, { stockLengthMm: 5850, kerfMm: 4 });
  const b = optimizeCutting(d, { stockLengthMm: 5850, kerfMm: 4 });
  assert.strictEqual(a.barsUsed, b.barsUsed);
  assert.strictEqual(a.wasteMm, b.wasteMm);
});

test('đạt hoặc gần cận dưới lý thuyết', () => {
  const demands = [
    { lengthMm: 1400, qty: 6, label: 'a' },
    { lengthMm: 1600, qty: 6, label: 'b' },
    { lengthMm:  625, qty: 12, label: 'c' },
    { lengthMm: 1510, qty: 12, label: 'd' },
  ];
  const p = optimizeCutting(demands, { stockLengthMm: 5850, kerfMm: 4, attempts: 100 });
  const totalNeed = demands.reduce((s, d) => s + (d.lengthMm + 4) * d.qty, 0);
  const lowerBound = Math.ceil(totalNeed / 5850);
  assert.ok(p.barsUsed <= lowerBound + 1, `dùng ${p.barsUsed} cây, cận dưới ${lowerBound}`);
});

test('hao hụt thấp hơn nhiều so với xếp tay (~15%)', () => {
  const demands = [
    { lengthMm: 1400, qty: 6, label: 'a' },
    { lengthMm: 1600, qty: 6, label: 'b' },
    { lengthMm:  625, qty: 12, label: 'c' },
    { lengthMm: 1510, qty: 12, label: 'd' },
  ];
  const p = optimizeCutting(demands, { stockLengthMm: 5850, kerfMm: 4, attempts: 100 });
  assert.ok(p.wastePercent < 10, `hao ${p.wastePercent}% — chưa đủ tốt`);
});

test('dùng đầu thừa trong kho trước khi mở cây mới', () => {
  const p = optimizeCutting([{ lengthMm: 1500, qty: 2, label: 'x' }], {
    stockLengthMm: 5850, kerfMm: 4, remnantsMm: [1600, 1600],
  });
  assert.strictEqual(p.barsUsed, 0, 'phải dùng hết đầu thừa, không mở cây nguyên');
});

test('đoạn dài hơn cây nhôm báo lỗi có hướng xử lý', () => {
  assert.throws(
    () => optimizeCutting([{ lengthMm: 6200, qty: 1, label: 'quá dài' }], { stockLengthMm: 5850 }),
    /vượt quá cây nhôm/
  );
});

test('chỉ gộp cắt chung khi cùng mã VÀ cùng màu', () => {
  const parts = [
    { profileCode: 'XF55-KB', profileName: 'K', finishCode: 'GHI',   lengthMm: 1400, qty: 2, angle: 'A45', label: 'a' },
    { profileCode: 'XF55-KB', profileName: 'K', finishCode: 'TRANG', lengthMm: 1400, qty: 2, angle: 'A45', label: 'b' },
    { profileCode: 'XF55-CA', profileName: 'C', finishCode: 'GHI',   lengthMm:  625, qty: 4, angle: 'A45', label: 'c' },
  ];
  assert.strictEqual(groupForCutting(parts).length, 3);
});

test('gộp số lượng khi cùng mã, màu, chiều dài, góc cắt', () => {
  const parts = [
    { profileCode: 'XF55-KB', profileName: 'K', finishCode: 'GHI', lengthMm: 1400, qty: 2, angle: 'A45', label: 'a' },
    { profileCode: 'XF55-KB', profileName: 'K', finishCode: 'GHI', lengthMm: 1400, qty: 3, angle: 'A45', label: 'b' },
  ];
  const g = groupForCutting(parts);
  assert.strictEqual(g.length, 1);
  assert.strictEqual(g[0].demands.length, 1);
  assert.strictEqual(g[0].demands[0].qty, 5);
});

// ── Tính giá ──────────────────────────────────────────────────────────────
group('Tính giá');

test('mọi số tiền là số nguyên đồng', () => {
  const c = costDetailed(mq2c);
  for (const [k, v] of Object.entries(c)) {
    if (typeof v === 'number' && k.toLowerCase().includes('cost')) {
      assert.ok(Number.isInteger(v), `${k} không nguyên: ${v}`);
    }
  }
});

test('tổng chi phí = vật tư + hao + nhân công', () => {
  const c = costDetailed(mq2c);
  assert.strictEqual(c.totalCost, c.materialCost + c.wasteCost + c.laborCost);
  assert.strictEqual(c.materialCost, c.aluCost + c.glassCost + c.hwCost);
});

test('giá bán cao hơn giá vốn đúng bằng % lợi nhuận', () => {
  const c = costDetailed(mq2c, { markupPercent: 30 });
  assert.strictEqual(c.totalPrice, Math.round(c.totalCost * 1.3));
});

test('màu vân gỗ đắt hơn màu trắng', () => {
  const trang = costDetailed(explodeDoor({ templateCode: 'MQ2C', widthMm: 1400, heightMm: 1600, quantity: 1, finishCode: 'TRANG', glassCode: 'H595' }));
  const vango = costDetailed(explodeDoor({ templateCode: 'MQ2C', widthMm: 1400, heightMm: 1600, quantity: 1, finishCode: 'VANGO', glassCode: 'H595' }));
  assert.ok(vango.aluCost > trang.aluCost);
});

test('so sánh 2 chế độ báo giá và cảnh báo lỗ', () => {
  const cmp = comparePricing(mq2c);
  assert.ok(cmp.perM2);
  assert.ok(['LO', 'MONG', 'TOT'].includes(cmp.verdict.status));
  // Nếu đơn giá m² thấp hơn giá vốn thì PHẢI cảnh báo lỗ
  const re = comparePricing(mq2c, { ratePerM2: 100_000 });
  assert.strictEqual(re.verdict.status, 'LO');
});

test('giá tỉ lệ đúng khi tăng số bộ', () => {
  const x1 = costDetailed(explodeDoor({ templateCode: 'MQ2C', widthMm: 1400, heightMm: 1600, quantity: 1, finishCode: 'GHI', glassCode: 'H595' }));
  const x4 = costDetailed(explodeDoor({ templateCode: 'MQ2C', widthMm: 1400, heightMm: 1600, quantity: 4, finishCode: 'GHI', glassCode: 'H595' }));
  const ratio = x4.totalCost / x1.totalCost;
  assert.ok(Math.abs(ratio - 4) < 0.02, `tỉ lệ ${ratio}, đáng lẽ ~4`);
});

// ── Toàn đơn ──────────────────────────────────────────────────────────────
group('Toàn đơn hàng');

test('gộp phụ kiện toàn đơn không mất mục nào', () => {
  const r = explodeOrder([
    { templateCode: 'MQ2C', widthMm: 1400, heightMm: 1600, quantity: 3, finishCode: 'GHI', glassCode: 'H595' },
    { templateCode: 'MQ1C', widthMm:  800, heightMm: 1200, quantity: 4, finishCode: 'GHI', glassCode: 'H595' },
  ]);
  const banle = r.allHardware.find((h) => h.code === 'BANLE');
  assert.strictEqual(banle.qty, 3 * 4 + 4 * 2);  // 12 + 8
});

test('mỗi đoạn cắt truy được về dòng báo giá nào', () => {
  const r = explodeOrder([
    { itemRef: 'D1', templateCode: 'MQ2C', widthMm: 1400, heightMm: 1600, quantity: 1, finishCode: 'GHI', glassCode: 'H595' },
  ]);
  assert.ok(r.allParts.every((p) => p.itemRef === 'D1'));
});

// ── Kết luận ──────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(50)}`);
console.log(`  ${passed} đạt, ${failed} lỗi`);
console.log('═'.repeat(50) + '\n');
process.exit(failed > 0 ? 1 : 0);
