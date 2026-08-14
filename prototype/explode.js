'use strict';
/**
 * Bóc tách bộ cửa: từ (mẫu cửa, rộng, cao) → danh sách thanh nhôm cần cắt,
 * tấm kính và phụ kiện.
 *
 * Đây là hàm quan trọng nhất của toàn hệ thống. Nó phải:
 *   - thuần tuý (pure): cùng đầu vào luôn cho cùng đầu ra
 *   - không phụ thuộc CSDL hay framework
 *   - trả về mm nguyên, không có số thập phân
 */

const { evalExpr, evalMm } = require('./formula');
const db = require('./data');

/**
 * @param {object} input
 * @param {string} input.templateCode
 * @param {number} input.widthMm    kích thước phủ bì
 * @param {number} input.heightMm
 * @param {number} input.quantity   số bộ cửa giống nhau
 * @param {string} input.finishCode
 * @param {string} input.glassCode
 * @param {string} [input.itemRef]  mã dòng báo giá, để in lên phiếu cắt
 */
function explodeDoor(input) {
  const template = db.templates[input.templateCode];
  if (!template) throw new Error(`Không có mẫu cửa "${input.templateCode}"`);

  const system = db.systems[template.system];
  if (!system) throw new Error(`Không có hệ nhôm "${template.system}"`);

  const finish = db.finishes[input.finishCode];
  if (!finish) throw new Error(`Không có màu "${input.finishCode}"`);

  const glassType = db.glassTypes[input.glassCode];
  if (!glassType) throw new Error(`Không có loại kính "${input.glassCode}"`);

  const W = Math.round(input.widthMm);
  const H = Math.round(input.heightMm);
  const quantity = Math.max(1, Math.round(input.quantity ?? 1));

  validateSize(W, H, template);

  // Scope bắt đầu bằng W, H, sash và hằng số của hệ.
  const scope = { W, H, sash: template.sashCount, ...system.constants };

  // ── Thanh nhôm ─────────────────────────────────────────────────────────
  const parts = [];
  const orderedParts = [...template.parts].sort((a, b) => a.order - b.order);

  for (const def of orderedParts) {
    const profile = db.profiles[def.profile];
    if (!profile) throw new Error(`Không có profile "${def.profile}"`);

    const lengthMm = evalMm(def.lengthExpr, scope);
    const qtyPerSet = Math.round(evalExpr(def.qtyExpr, scope));

    if (lengthMm <= 0) {
      throw new Error(
        `Thanh "${def.label}" ra chiều dài ${lengthMm} mm (≤ 0). ` +
        `Kích thước ${W}×${H} quá nhỏ cho mẫu "${template.name}", ` +
        `hoặc hằng số trừ hao của hệ đang sai.`
      );
    }

    // Cho phép các thanh sau tham chiếu chiều dài thanh này (ví dụ nẹp kính
    // tính từ chiều dài cánh). Đây là lý do thứ tự `order` quan trọng.
    scope[def.key] = lengthMm;

    const totalQty = qtyPerSet * quantity;
    const weightG = Math.round((lengthMm / 1000) * profile.gramPerM * totalQty);

    parts.push({
      key: def.key,
      label: def.label,
      profileCode: profile.code,
      profileName: profile.name,
      finishCode: finish.code,
      lengthMm,
      qtyPerSet,
      qty: totalQty,
      angle: def.angle,
      stockLengthMm: system.stockLengthMm,
      weightG,
      itemRef: input.itemRef ?? null,
    });
  }

  // ── Kính ───────────────────────────────────────────────────────────────
  const glass = [];
  for (const def of template.glass ?? []) {
    const rawW = evalMm(def.widthExpr, scope);
    const rawH = evalMm(def.heightExpr, scope);
    const qtyPerSet = Math.round(evalExpr(def.qtyExpr, scope));

    if (rawW <= 0 || rawH <= 0) {
      throw new Error(`Kính "${def.label}" ra kích thước ${rawW}×${rawH} mm (≤ 0).`);
    }

    // Nhà cung cấp kính cắt theo bội số — làm tròn LÊN, không bao giờ xuống.
    const r = glassType.roundToMm || 1;
    const widthMm = Math.ceil(rawW / r) * r;
    const heightMm = Math.ceil(rawH / r) * r;

    // Diện tích tính tiền có mức tối thiểu.
    const areaMm2 = Math.max(widthMm * heightMm, glassType.minAreaMm2 ?? 0);

    glass.push({
      label: def.label,
      glassCode: glassType.code,
      glassName: glassType.name,
      widthMm,
      heightMm,
      qtyPerSet,
      qty: qtyPerSet * quantity,
      areaM2: +((areaMm2 / 1_000_000) * qtyPerSet * quantity).toFixed(4),
      itemRef: input.itemRef ?? null,
    });
  }

  // ── Phụ kiện ───────────────────────────────────────────────────────────
  const hardware = [];
  for (const def of template.hardware ?? []) {
    const item = db.hardware[def.code];
    if (!item) throw new Error(`Không có phụ kiện "${def.code}"`);

    const raw = evalExpr(def.qtyExpr, scope);
    // Đơn vị đếm được thì làm tròn lên (không mua nửa cái bản lề);
    // đơn vị đo được (mét, kg) giữ số lẻ 2 chữ số.
    const countable = item.unit === 'CAI' || item.unit === 'BO';
    const qtyPerSet = countable ? Math.ceil(raw) : +raw.toFixed(2);

    hardware.push({
      code: item.code,
      name: item.name,
      unit: item.unit,
      qtyPerSet,
      qty: countable ? qtyPerSet * quantity : +(qtyPerSet * quantity).toFixed(2),
      itemRef: input.itemRef ?? null,
    });
  }

  return {
    template: { code: template.code, name: template.name, sashCount: template.sashCount, drawingKind: template.drawingKind },
    system: system.code,
    widthMm: W,
    heightMm: H,
    quantity,
    finishCode: finish.code,
    glassCode: glassType.code,
    areaM2: +(((W * H) / 1_000_000) * quantity).toFixed(4),
    parts,
    glass,
    hardware,
    scope,   // giữ lại để hiển thị "vì sao ra số này" khi người dùng thắc mắc
  };
}

function validateSize(W, H, template) {
  if (!Number.isFinite(W) || !Number.isFinite(H) || W <= 0 || H <= 0) {
    throw new Error(`Kích thước không hợp lệ: ${W}×${H} mm`);
  }
  if (W < 300 || H < 300) {
    throw new Error(`Kích thước ${W}×${H} mm quá nhỏ, tối thiểu 300 mm mỗi chiều.`);
  }
  if (W > 6000 || H > 4000) {
    throw new Error(
      `Kích thước ${W}×${H} mm vượt giới hạn. Cửa lớn phải chia thành nhiều khoang ` +
      `và ghép bằng thanh nối (adapter).`
    );
  }
  // Cảnh báo kỹ thuật thật: cánh mở quay quá rộng sẽ võng và xệ bản lề.
  if (template.sashCount > 0) {
    const sashWidth = W / template.sashCount;
    if (sashWidth > 900) {
      throw new Error(
        `Mỗi cánh rộng ${Math.round(sashWidth)} mm, vượt 900 mm. ` +
        `Cánh mở quay quá rộng sẽ xệ bản lề. Hãy tăng số cánh hoặc thêm đố cố định.`
      );
    }
  }
}

/** Gộp bóc tách của nhiều dòng báo giá thành một danh sách chung cho cả đơn hàng. */
function explodeOrder(items) {
  const results = items.map((it, i) => explodeDoor({ ...it, itemRef: it.itemRef ?? `D${i + 1}` }));
  return {
    items: results,
    allParts: results.flatMap((r) => r.parts),
    allGlass: results.flatMap((r) => r.glass),
    allHardware: mergeHardware(results.flatMap((r) => r.hardware)),
  };
}

function mergeHardware(list) {
  const map = new Map();
  for (const h of list) {
    const cur = map.get(h.code);
    if (cur) {
      cur.qty = +(cur.qty + h.qty).toFixed(2);
    } else {
      map.set(h.code, { code: h.code, name: h.name, unit: h.unit, qty: h.qty });
    }
  }
  return [...map.values()].map((h) => ({
    ...h,
    qty: h.unit === 'CAI' || h.unit === 'BO' ? Math.ceil(h.qty) : h.qty,
  }));
}

module.exports = { explodeDoor, explodeOrder, mergeHardware };
