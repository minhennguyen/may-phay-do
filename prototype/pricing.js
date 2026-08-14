'use strict';
/**
 * Tính giá.
 *
 * Hai chế độ, phải hỗ trợ CẢ HAI và cho so sánh cạnh nhau:
 *   A. PER_M2   — báo nhanh theo m², nhân viên bán hàng dùng khi tiếp khách
 *   B. DETAILED — bóc tách chi tiết, chủ xưởng dùng để biết lãi thật bao nhiêu
 *
 * Mọi số tiền là số nguyên ĐỒNG. Không dùng số thực cho tiền.
 */

const db = require('./data');

/** Chi phí vật tư chi tiết cho một bộ (hoặc nhiều bộ giống nhau). */
function costDetailed(exploded, opts = {}) {
  const wastePercent = opts.wastePercent ?? db.settings.wastePercent;
  const markupPercent = opts.markupPercent ?? db.settings.markupPercent;
  const laborPerM2 = opts.laborPerM2 ?? db.settings.laborPerM2;
  const finish = db.finishes[exploded.finishCode];

  // ── Nhôm: tính theo KG ──────────────────────────────────────────────────
  const aluLines = [];
  const byProfile = new Map();
  for (const p of exploded.parts) {
    const cur = byProfile.get(p.profileCode) ?? { ...p, weightG: 0, qty: 0, totalLenMm: 0 };
    cur.weightG += p.weightG;
    cur.qty += p.qty;
    cur.totalLenMm += p.lengthMm * p.qty;
    byProfile.set(p.profileCode, cur);
  }
  let aluCost = 0;
  for (const p of byProfile.values()) {
    const kg = p.weightG / 1000;
    const unitPrice = Math.round(db.aluPricePerKg * finish.priceMultiplier);
    const amount = Math.round(kg * unitPrice);
    aluCost += amount;
    aluLines.push({
      code: p.profileCode, name: p.profileName,
      qty: p.qty, totalLenM: +(p.totalLenMm / 1000).toFixed(2),
      kg: +kg.toFixed(3), unitPrice, amount,
    });
  }

  // ── Kính ────────────────────────────────────────────────────────────────
  const glassLines = [];
  let glassCost = 0;
  for (const g of exploded.glass) {
    const type = db.glassTypes[g.glassCode];
    const amount = Math.round(g.areaM2 * type.pricePerM2);
    glassCost += amount;
    glassLines.push({
      code: g.glassCode, name: g.glassName,
      size: `${g.widthMm}×${g.heightMm}`, qty: g.qty,
      areaM2: g.areaM2, unitPrice: type.pricePerM2, amount,
    });
  }

  // ── Phụ kiện ────────────────────────────────────────────────────────────
  const hwLines = [];
  let hwCost = 0;
  for (const h of exploded.hardware) {
    const item = db.hardware[h.code];
    const amount = Math.round(h.qty * item.price);
    hwCost += amount;
    hwLines.push({ code: h.code, name: h.name, unit: h.unit, qty: h.qty, unitPrice: item.price, amount });
  }

  // ── Tổng hợp ────────────────────────────────────────────────────────────
  const materialCost = aluCost + glassCost + hwCost;
  const wasteCost = Math.round(materialCost * wastePercent / 100);
  const laborCost = Math.round(exploded.areaM2 * laborPerM2);

  const totalCost = materialCost + wasteCost + laborCost;
  const totalPrice = Math.round(totalCost * (1 + markupPercent / 100));

  return {
    mode: 'DETAILED',
    aluLines, glassLines, hwLines,
    aluCost, glassCost, hwCost,
    materialCost, wasteCost, laborCost,
    wastePercent, markupPercent,
    totalCost, totalPrice,
    pricePerM2: exploded.areaM2 > 0 ? Math.round(totalPrice / exploded.areaM2) : 0,
    profit: totalPrice - totalCost,
  };
}

/** Báo giá nhanh theo m². */
function costPerM2(exploded, opts = {}) {
  const rate = opts.ratePerM2 ?? db.settings.pricePerM2[exploded.template.code];
  if (!rate) throw new Error(`Chưa có đơn giá m² cho mẫu "${exploded.template.code}"`);

  const minAreaM2 = opts.minAreaM2 ?? db.settings.minAreaM2;
  const areaPerSet = (exploded.widthMm * exploded.heightMm) / 1_000_000;
  const billableAreaM2 = Math.max(areaPerSet, minAreaM2) * exploded.quantity;
  const totalPrice = Math.round(billableAreaM2 * rate);

  return {
    mode: 'PER_M2',
    ratePerM2: rate,
    actualAreaM2: +(areaPerSet * exploded.quantity).toFixed(4),
    billableAreaM2: +billableAreaM2.toFixed(4),
    totalPrice,
  };
}

/**
 * So sánh 2 chế độ — tính năng bán hàng mạnh nhất của phần mềm này.
 * Cho chủ xưởng thấy ngay: báo theo m² đang lãi hay lỗ so với giá vốn thật.
 */
function comparePricing(exploded, opts = {}) {
  const detailed = costDetailed(exploded, opts);
  let perM2 = null;
  try {
    perM2 = costPerM2(exploded, opts);
  } catch { /* mẫu chưa có đơn giá m² thì bỏ qua */ }

  if (!perM2) return { detailed, perM2: null, verdict: null };

  const profit = perM2.totalPrice - detailed.totalCost;
  const marginPercent = detailed.totalCost > 0
    ? +((profit / detailed.totalCost) * 100).toFixed(1)
    : 0;

  return {
    detailed,
    perM2,
    verdict: {
      profit,
      marginPercent,
      status: profit < 0 ? 'LO' : marginPercent < 15 ? 'MONG' : 'TOT',
      message:
        profit < 0
          ? `⚠️ LỖ ${formatVND(-profit)} nếu báo theo m². Giá vốn ${formatVND(detailed.totalCost)} > giá bán ${formatVND(perM2.totalPrice)}.`
          : marginPercent < 15
            ? `⚠️ Lãi mỏng, chỉ ${marginPercent}%. Cân nhắc tăng đơn giá m².`
            : `✓ Lãi ${formatVND(profit)} (${marginPercent}%).`,
    },
  };
}

function formatVND(d) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(d)) + ' đ';
}

module.exports = { costDetailed, costPerM2, comparePricing, formatVND };
