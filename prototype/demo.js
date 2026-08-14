'use strict';
/**
 * Chạy: node prototype/demo.js
 *
 * Mô phỏng trọn vẹn một đơn hàng: bóc tách → tối ưu cắt → tính giá → xuất bản vẽ.
 * Đây chính là luồng nghiệp vụ mà phần mềm thật phải làm, chỉ khác là dữ liệu
 * lấy từ file thay vì CSDL, và kết quả in ra màn hình thay vì Excel/PDF.
 */

const fs = require('fs');
const path = require('path');
const { explodeOrder } = require('./explode');
const { optimizeCutting, groupForCutting } = require('./optimize');
const { comparePricing, costDetailed, formatVND } = require('./pricing');
const { drawDoorSvg, drawCuttingPlanSvg } = require('./draw');

// ── Đơn hàng mẫu ──────────────────────────────────────────────────────────
const order = [
  { itemRef: 'D1', templateCode: 'MQ2C', widthMm: 1400, heightMm: 1600, quantity: 3, finishCode: 'GHI', glassCode: 'H595' },
  { itemRef: 'D2', templateCode: 'MQ1C', widthMm:  800, heightMm: 1200, quantity: 4, finishCode: 'GHI', glassCode: 'H595' },
  { itemRef: 'D3', templateCode: 'FIX',  widthMm: 1800, heightMm:  600, quantity: 2, finishCode: 'GHI', glassCode: 'CL8'  },
];

const line = (ch = '─') => console.log(ch.repeat(78));
const money = formatVND;

console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║  DEMO PHẦN MỀM SẢN XUẤT CỬA NHÔM — bóc tách, tối ưu cắt, báo giá         ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');

const result = explodeOrder(order);

// ── 1. Bóc tách từng bộ cửa ───────────────────────────────────────────────
for (const item of result.items) {
  console.log(`\n▌ ${item.parts[0].itemRef} — ${item.template.name}  ${item.widthMm}×${item.heightMm} mm  ×${item.quantity} bộ`);
  line();
  console.log('  Thanh nhôm cần cắt:');
  console.log('  ' + 'Tên thanh'.padEnd(20) + 'Mã'.padEnd(10) + 'Dài(mm)'.padStart(9) + 'SL/bộ'.padStart(7) + 'Tổng'.padStart(7) + '  Góc');
  for (const p of item.parts) {
    console.log(
      '  ' + p.label.padEnd(20) + p.profileCode.padEnd(10) +
      String(p.lengthMm).padStart(9) + String(p.qtyPerSet).padStart(7) +
      String(p.qty).padStart(7) + '  ' + (p.angle === 'A45' ? '45°' : '90°')
    );
  }
  console.log('\n  Kính:');
  for (const g of item.glass) {
    console.log(`  ${g.label.padEnd(20)} ${g.glassName.padEnd(18)} ${g.widthMm}×${g.heightMm} mm  ×${g.qty}  = ${g.areaM2} m²`);
  }
}

// ── 2. Phụ kiện toàn đơn ──────────────────────────────────────────────────
console.log('\n▌ PHỤ KIỆN TOÀN ĐƠN');
line();
for (const h of result.allHardware) {
  console.log(`  ${h.name.padEnd(24)} ${String(h.qty).padStart(8)} ${h.unit}`);
}

// ── 3. Tối ưu cắt ─────────────────────────────────────────────────────────
console.log('\n▌ TỐI ƯU CẮT PHÔI (cây 5850 mm, lưỡi cắt 4 mm)');
line('═');

const groups = groupForCutting(result.allParts);
let totalBars = 0;
let totalWasteMm = 0;
let totalStockMm = 0;
const plans = [];

for (const g of groups) {
  const plan = optimizeCutting(g.demands, { stockLengthMm: g.stockLengthMm, kerfMm: 4, attempts: 80 });
  plans.push({ group: g, plan });
  totalBars += plan.barsUsed;
  totalWasteMm += plan.wasteMm;
  totalStockMm += plan.totalStockMm;

  console.log(`\n  ${g.profileCode}  ${g.profileName}  (màu ${g.finishCode})`);
  console.log(`  → ${plan.barsUsed} cây, hao ${plan.wastePercent}% (${(plan.wasteMm / 1000).toFixed(2)} m)`);
  for (const bar of plan.bars) {
    const items = bar.pieces.map((p) => `${p.lengthMm}`).join(' + ');
    console.log(`     Cây ${String(bar.index).padStart(2)}: ${items}   ⟶ dư ${bar.remainMm} mm`);
  }
}

const overallWaste = totalStockMm > 0 ? ((totalWasteMm / totalStockMm) * 100).toFixed(2) : 0;
console.log(`\n  TỔNG: ${totalBars} cây nhôm | hao hụt chung ${overallWaste}%`);
console.log(`  (Thợ xếp tay thường hao 12–18% — đây là giá trị tiền mặt phần mềm mang lại)`);

// ── 4. Báo giá ────────────────────────────────────────────────────────────
console.log('\n▌ BÁO GIÁ');
line('═');

let grandCost = 0;
let grandPriceDetailed = 0;
let grandPricePerM2 = 0;

for (const item of result.items) {
  const cmp = comparePricing(item);
  grandCost += cmp.detailed.totalCost;
  grandPriceDetailed += cmp.detailed.totalPrice;
  if (cmp.perM2) grandPricePerM2 += cmp.perM2.totalPrice;

  console.log(`\n  ${item.parts[0].itemRef} — ${item.template.name} ${item.widthMm}×${item.heightMm} ×${item.quantity}`);
  console.log(`    Nhôm      ${money(cmp.detailed.aluCost).padStart(16)}`);
  console.log(`    Kính      ${money(cmp.detailed.glassCost).padStart(16)}`);
  console.log(`    Phụ kiện  ${money(cmp.detailed.hwCost).padStart(16)}`);
  console.log(`    Hao ${String(cmp.detailed.wastePercent).padStart(2)}%   ${money(cmp.detailed.wasteCost).padStart(16)}`);
  console.log(`    Nhân công ${money(cmp.detailed.laborCost).padStart(16)}`);
  console.log(`    ${'─'.repeat(30)}`);
  console.log(`    GIÁ VỐN   ${money(cmp.detailed.totalCost).padStart(16)}`);
  console.log(`    Báo chi tiết (+${cmp.detailed.markupPercent}%)  ${money(cmp.detailed.totalPrice).padStart(16)}`);
  if (cmp.perM2) {
    console.log(`    Báo theo m² (${money(cmp.perM2.ratePerM2)}/m² × ${cmp.perM2.billableAreaM2} m²)  ${money(cmp.perM2.totalPrice).padStart(14)}`);
    console.log(`    ${cmp.verdict.message}`);
  }
}

line('═');
console.log(`  TỔNG GIÁ VỐN         ${money(grandCost).padStart(18)}`);
console.log(`  TỔNG BÁO CHI TIẾT    ${money(grandPriceDetailed).padStart(18)}`);
console.log(`  TỔNG BÁO THEO m²     ${money(grandPricePerM2).padStart(18)}`);
console.log(`  Chênh lệch 2 cách báo: ${money(grandPriceDetailed - grandPricePerM2)}`);

// ── 5. Xuất bản vẽ ────────────────────────────────────────────────────────
const outDir = path.join(__dirname, 'output');
fs.mkdirSync(outDir, { recursive: true });

for (const item of result.items) {
  const ref = item.parts[0].itemRef;
  fs.writeFileSync(path.join(outDir, `ban-ve-${ref}.svg`), drawDoorSvg(item, { itemRef: ref }));
}
for (const { group, plan } of plans) {
  fs.writeFileSync(
    path.join(outDir, `phieu-cat-${group.profileCode}-${group.finishCode}.svg`),
    drawCuttingPlanSvg(group, plan)
  );
}

console.log(`\n▌ ĐÃ XUẤT BẢN VẼ`);
line();
for (const f of fs.readdirSync(outDir).sort()) {
  console.log('  ' + path.join('prototype/output', f));
}
console.log('\n  Trong sản phẩm thật: đổi SVG → PNG bằng @resvg/resvg-js rồi gửi Zalo cho thợ.\n');
