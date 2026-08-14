'use strict';
/**
 * Tối ưu cắt phôi 1 chiều (1D cutting stock).
 *
 * Bài toán: có N đoạn cần cắt với chiều dài khác nhau, phải cắt từ các cây nhôm
 * dài cố định (5850 mm). Xếp sao cho dùng ít cây nhất.
 *
 * Đây là bài toán NP-hard. Không có thuật toán nhanh cho lời giải tối ưu tuyệt đối.
 * Thực tế chỉ cần tốt hơn thợ xếp tay là đã có giá trị — thợ thường hao 12-18%,
 * thuật toán dưới đây đưa về 3-7%.
 *
 * Cách làm: Best Fit Decreasing + nhiều lần chạy ngẫu nhiên, giữ kết quả tốt nhất.
 */

/** Bề rộng lưỡi cắt mất đi mỗi nhát (mm). Máy cắt nhôm thường 3-5 mm. */
const DEFAULT_KERF_MM = 4;

/** Đoạn dư dài hơn ngưỡng này thì đáng giữ lại dùng cho đơn sau. */
const REMNANT_THRESHOLD_MM = 500;

/**
 * @param {{lengthMm:number, qty:number, label?:string, angle?:string, itemRef?:string}[]} demands
 * @param {object} opts
 * @param {number} opts.stockLengthMm  chiều dài cây nguyên, mặc định 5850
 * @param {number} opts.kerfMm         bề rộng lưỡi cắt
 * @param {number} opts.trimStartMm    cắt bỏ đầu cây (đầu bẹp/xước)
 * @param {number} opts.trimEndMm      cắt bỏ cuối cây
 * @param {number} opts.attempts       số lần chạy ngẫu nhiên
 * @param {number[]} opts.remnantsMm   các đầu thừa còn trong kho, ưu tiên dùng trước
 */
function optimizeCutting(demands, opts = {}) {
  const stockLengthMm = opts.stockLengthMm ?? 5850;
  const kerfMm = opts.kerfMm ?? DEFAULT_KERF_MM;
  const trimStartMm = opts.trimStartMm ?? 0;
  const trimEndMm = opts.trimEndMm ?? 0;
  const attempts = opts.attempts ?? 60;
  const remnantsMm = opts.remnantsMm ?? [];

  const usableMm = stockLengthMm - trimStartMm - trimEndMm;

  // Bung số lượng thành từng đoạn riêng lẻ.
  const pieces = [];
  for (const d of demands) {
    const qty = Math.max(0, Math.round(d.qty ?? 0));
    if (qty === 0) continue;
    if (!Number.isFinite(d.lengthMm) || d.lengthMm <= 0) {
      throw new Error(`Chiều dài không hợp lệ cho "${d.label ?? '?'}": ${d.lengthMm}`);
    }
    if (d.lengthMm + kerfMm > usableMm) {
      throw new Error(
        `Đoạn "${d.label ?? '?'}" dài ${d.lengthMm} mm, vượt quá cây nhôm ` +
        `${stockLengthMm} mm (khả dụng ${usableMm} mm). Cần đặt cây dài hơn hoặc nối thanh.`
      );
    }
    for (let i = 0; i < qty; i++) {
      pieces.push({ lengthMm: d.lengthMm, label: d.label ?? '', angle: d.angle ?? 'A90', itemRef: d.itemRef ?? null });
    }
  }

  if (pieces.length === 0) {
    return { bars: [], barsUsed: 0, totalPieceMm: 0, totalStockMm: 0, wasteMm: 0, wastePercent: 0, remnants: [] };
  }

  // Chạy nhiều phương án, giữ phương án tốt nhất.
  let best = null;
  let rngState = 0x2f6e2b1 >>> 0;
  const rand = () => {
    // xorshift32 — tất định để chạy lại cho cùng kết quả (quan trọng khi in phiếu lại)
    rngState ^= rngState << 13; rngState >>>= 0;
    rngState ^= rngState >>> 17;
    rngState ^= rngState << 5;  rngState >>>= 0;
    return rngState / 0x100000000;
  };

  for (let attempt = 0; attempt < attempts; attempt++) {
    const order = pieces.slice().sort((a, b) => b.lengthMm - a.lengthMm);

    if (attempt > 0) {
      // Xáo trộn nhẹ trong nhóm chiều dài gần nhau để thoát khỏi cực trị cục bộ.
      for (let i = order.length - 1; i > 0; i--) {
        if (rand() < 0.30) {
          const j = Math.max(0, i - 1 - Math.floor(rand() * 3));
          [order[i], order[j]] = [order[j], order[i]];
        }
      }
    }

    const solution = packBestFit(order, {
      usableMm, kerfMm, stockLengthMm, trimStartMm, remnantsMm,
    });

    if (
      best === null ||
      solution.barsUsed < best.barsUsed ||
      (solution.barsUsed === best.barsUsed && solution.wasteMm < best.wasteMm)
    ) {
      best = solution;
    }
  }

  return best;
}

function packBestFit(order, ctx) {
  const { usableMm, kerfMm, stockLengthMm, trimStartMm, remnantsMm } = ctx;
  const bars = [];

  // Đầu thừa trong kho được nạp trước, dùng hết mới mở cây mới.
  for (const r of remnantsMm) {
    bars.push({ kind: 'REMNANT', capacityMm: r, remainMm: r, cursorMm: 0, pieces: [] });
  }

  for (const piece of order) {
    const need = piece.lengthMm + kerfMm;

    // Best fit: chọn cây có phần dư nhỏ nhất mà vẫn chứa được.
    let bestBar = null;
    for (const bar of bars) {
      if (bar.remainMm >= need && (bestBar === null || bar.remainMm < bestBar.remainMm)) {
        bestBar = bar;
      }
    }

    if (bestBar === null) {
      bestBar = {
        kind: 'FULL',
        capacityMm: usableMm,
        remainMm: usableMm,
        cursorMm: trimStartMm,
        pieces: [],
      };
      bars.push(bestBar);
    }

    bestBar.pieces.push({ ...piece, positionMm: bestBar.cursorMm });
    bestBar.cursorMm += need;
    bestBar.remainMm -= need;
  }

  const used = bars.filter((b) => b.pieces.length > 0);
  const fullBars = used.filter((b) => b.kind === 'FULL');

  const totalPieceMm = used.reduce(
    (sum, b) => sum + b.pieces.reduce((s, p) => s + p.lengthMm, 0), 0
  );
  const totalStockMm =
    fullBars.length * stockLengthMm +
    used.filter((b) => b.kind === 'REMNANT').reduce((s, b) => s + b.capacityMm, 0);

  const wasteMm = totalStockMm - totalPieceMm;

  const remnants = used
    .filter((b) => b.remainMm >= 500)
    .map((b) => Math.round(b.remainMm))
    .sort((a, b) => b - a);

  return {
    bars: used.map((b, idx) => ({
      index: idx + 1,
      kind: b.kind,
      capacityMm: Math.round(b.capacityMm),
      usedMm: Math.round(b.capacityMm - b.remainMm),
      remainMm: Math.round(b.remainMm),
      pieces: b.pieces,
    })),
    barsUsed: fullBars.length,
    totalPieceMm: Math.round(totalPieceMm),
    totalStockMm: Math.round(totalStockMm),
    wasteMm: Math.round(wasteMm),
    wastePercent: totalStockMm > 0 ? +((wasteMm / totalStockMm) * 100).toFixed(2) : 0,
    remnants,
  };
}

/**
 * Gom danh sách thanh của cả đơn hàng thành các nhóm cắt riêng.
 * Chỉ những thanh CÙNG mã profile VÀ CÙNG màu mới được cắt chung một cây.
 */
function groupForCutting(parts) {
  const groups = new Map();
  for (const p of parts) {
    const key = `${p.profileCode}::${p.finishCode}`;
    if (!groups.has(key)) {
      groups.set(key, {
        profileCode: p.profileCode,
        profileName: p.profileName,
        finishCode: p.finishCode,
        stockLengthMm: p.stockLengthMm ?? 5850,
        demands: [],
      });
    }
    const g = groups.get(key);
    const existing = g.demands.find((d) => d.lengthMm === p.lengthMm && d.angle === p.angle);
    if (existing) {
      existing.qty += p.qty;
    } else {
      g.demands.push({ lengthMm: p.lengthMm, qty: p.qty, label: p.label, angle: p.angle, itemRef: p.itemRef });
    }
  }
  return [...groups.values()];
}

module.exports = {
  optimizeCutting,
  groupForCutting,
  DEFAULT_KERF_MM,
  REMNANT_THRESHOLD_MM,
};
