'use strict';
/**
 * Sinh bản vẽ mặt đứng bộ cửa dạng SVG.
 *
 * Vì sao SVG:
 *   - Là văn bản thuần → sinh ra không cần thư viện, lưu vào CSDL cũng được
 *   - Đổi sang PNG bằng `@resvg/resvg-js` (nhanh, không cần trình duyệt) để gửi Zalo
 *   - In ra PDF vẫn nét ở mọi khổ giấy
 *
 * Yêu cầu quan trọng: thợ xem trên điện thoại 5 inch. Chữ phải TO,
 * nét phải ĐẬM, chỉ hiện thông tin cần thiết. Đừng vẽ đẹp, hãy vẽ ĐỌC ĐƯỢC.
 */

const PAD = 90;          // chừa chỗ ghi kích thước
const MAX_PX = 900;      // bề rộng ảnh mục tiêu

function drawDoorSvg(exploded, opts = {}) {
  const { widthMm: W, heightMm: H, template } = exploded;
  const c = { ...require('./data').systems[exploded.system].constants };

  const scale = Math.min((MAX_PX - 2 * PAD) / W, (MAX_PX - 2 * PAD) / H, 0.5);
  const w = W * scale;
  const h = H * scale;
  const svgW = Math.round(w + 2 * PAD);
  const svgH = Math.round(h + 2 * PAD);
  const x0 = PAD;
  const y0 = PAD;

  const el = [];

  // Nền trắng — Zalo nén ảnh, nền trong suốt sẽ thành đen.
  el.push(`<rect width="${svgW}" height="${svgH}" fill="#ffffff"/>`);

  // Khung bao
  const fw = c.Bk * scale;
  el.push(rect(x0, y0, w, h, '#111', 3, '#e8eef5'));
  el.push(rect(x0 + fw, y0 + fw, w - 2 * fw, h - 2 * fw, '#111', 2, '#ffffff'));

  const sash = template.sashCount;

  if (sash === 0) {
    // Vách cố định: chỉ có ô kính
    el.push(glassPane(x0 + fw, y0 + fw, w - 2 * fw, h - 2 * fw));
  } else {
    const innerX = x0 + fw;
    const innerY = y0 + fw;
    const innerW = w - 2 * fw;
    const innerH = h - 2 * fw;
    const mullionW = sash > 1 ? c.Bd * scale : 0;
    const sashW = (innerW - mullionW * (sash - 1)) / sash;
    const sw = c.Bc * scale;

    for (let i = 0; i < sash; i++) {
      const sx = innerX + i * (sashW + mullionW);
      el.push(rect(sx, innerY, sashW, innerH, '#111', 2, '#dfe9f3'));
      el.push(rect(sx + sw, innerY + sw, sashW - 2 * sw, innerH - 2 * sw, '#111', 1.5, '#ffffff'));
      el.push(glassPane(sx + sw, innerY + sw, sashW - 2 * sw, innerH - 2 * sw));
      // Ký hiệu chiều mở: hình chữ V hướng về phía bản lề
      el.push(openingMark(sx, innerY, sashW, innerH, i === 0 ? 'left' : 'right'));
    }

    // Đố động giữa các cánh
    for (let i = 1; i < sash; i++) {
      const mx = innerX + i * sashW + (i - 1) * mullionW;
      el.push(rect(mx, innerY, mullionW, innerH, '#111', 2, '#c9d6e4'));
    }
  }

  // Kích thước phủ bì
  el.push(dimH(x0, y0 + h + 34, w, `${W}`));
  el.push(dimV(x0 - 34, y0, h, `${H}`));

  // Nhãn
  const label = `${template.name} — ${W}×${H} — SL ${exploded.quantity} bộ`;
  el.push(`<text x="${svgW / 2}" y="${28}" font-family="Arial,sans-serif" font-size="22" font-weight="700" text-anchor="middle" fill="#111">${esc(label)}</text>`);
  const sub = `${exploded.system} | Màu ${exploded.finishCode} | Kính ${exploded.glassCode}${opts.itemRef ? ` | Mã ${opts.itemRef}` : ''}`;
  el.push(`<text x="${svgW / 2}" y="${52}" font-family="Arial,sans-serif" font-size="16" text-anchor="middle" fill="#444">${esc(sub)}</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
${el.join('\n')}
</svg>`;
}

function rect(x, y, w, h, stroke, sw, fill) {
  return `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

function glassPane(x, y, w, h) {
  if (w <= 0 || h <= 0) return '';
  // Vạch chéo là ký hiệu quy ước cho mặt kính trong bản vẽ xây dựng
  return `<line x1="${r(x)}" y1="${r(y + h)}" x2="${r(x + w)}" y2="${r(y)}" stroke="#8fb3d9" stroke-width="1.5"/>`;
}

function openingMark(x, y, w, h, hinge) {
  if (w <= 20 || h <= 20) return '';
  const midY = y + h / 2;
  const p = hinge === 'left'
    ? `${r(x + w)},${r(y + 6)} ${r(x + 6)},${r(midY)} ${r(x + w)},${r(y + h - 6)}`
    : `${r(x)},${r(y + 6)} ${r(x + w - 6)},${r(midY)} ${r(x)},${r(y + h - 6)}`;
  return `<polyline points="${p}" fill="none" stroke="#9aa7b4" stroke-width="1.5" stroke-dasharray="7 5"/>`;
}

function dimH(x, y, w, text) {
  return [
    `<line x1="${r(x)}" y1="${r(y)}" x2="${r(x + w)}" y2="${r(y)}" stroke="#111" stroke-width="1.5"/>`,
    tick(x, y), tick(x + w, y),
    `<text x="${r(x + w / 2)}" y="${r(y - 8)}" font-family="Arial,sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="#111">${esc(text)}</text>`,
  ].join('\n');
}

function dimV(x, y, h, text) {
  return [
    `<line x1="${r(x)}" y1="${r(y)}" x2="${r(x)}" y2="${r(y + h)}" stroke="#111" stroke-width="1.5"/>`,
    tick(x, y, true), tick(x, y + h, true),
    `<text x="${r(x - 8)}" y="${r(y + h / 2)}" font-family="Arial,sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="#111" transform="rotate(-90 ${r(x - 8)} ${r(y + h / 2)})">${esc(text)}</text>`,
  ].join('\n');
}

function tick(x, y, vertical = false) {
  return vertical
    ? `<line x1="${r(x - 6)}" y1="${r(y)}" x2="${r(x + 6)}" y2="${r(y)}" stroke="#111" stroke-width="1.5"/>`
    : `<line x1="${r(x)}" y1="${r(y - 6)}" x2="${r(x)}" y2="${r(y + 6)}" stroke="#111" stroke-width="1.5"/>`;
}

const r = (n) => Math.round(n * 100) / 100;
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/**
 * Sơ đồ phối cắt một cây nhôm — thợ cắt nhìn cái này để cắt.
 */
function drawCuttingPlanSvg(group, plan) {
  const barW = 900, barH = 46, gap = 22, top = 76;
  const svgH = top + plan.bars.length * (barH + gap) + 40;
  const el = [`<rect width="${barW + 80}" height="${svgH}" fill="#ffffff"/>`];

  el.push(`<text x="40" y="34" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#111">${esc(group.profileCode)} — ${esc(group.profileName)} — màu ${esc(group.finishCode)}</text>`);
  el.push(`<text x="40" y="58" font-family="Arial,sans-serif" font-size="16" fill="#444">${plan.barsUsed} cây ${group.stockLengthMm}mm | hao ${plan.wastePercent}% (${(plan.wasteMm / 1000).toFixed(2)} m)</text>`);

  plan.bars.forEach((bar, i) => {
    const y = top + i * (barH + gap);
    const sc = barW / bar.capacityMm;
    el.push(`<rect x="40" y="${y}" width="${barW}" height="${barH}" fill="#f2f2f2" stroke="#111" stroke-width="1.5"/>`);
    el.push(`<text x="20" y="${y + barH / 2 + 6}" font-family="Arial,sans-serif" font-size="16" font-weight="700" text-anchor="middle" fill="#111">${bar.index}</text>`);

    let cursor = 0;
    for (const p of bar.pieces) {
      const pw = p.lengthMm * sc;
      el.push(`<rect x="${r(40 + cursor * sc)}" y="${y}" width="${r(pw)}" height="${barH}" fill="#cfe3f7" stroke="#111" stroke-width="1.5"/>`);
      if (pw > 46) {
        el.push(`<text x="${r(40 + cursor * sc + pw / 2)}" y="${y + 20}" font-family="Arial,sans-serif" font-size="14" font-weight="700" text-anchor="middle" fill="#111">${p.lengthMm}</text>`);
        el.push(`<text x="${r(40 + cursor * sc + pw / 2)}" y="${y + 37}" font-family="Arial,sans-serif" font-size="11" text-anchor="middle" fill="#333">${esc(p.itemRef ?? '')} ${p.angle === 'A45' ? '45°' : '90°'}</text>`);
      }
      cursor += p.lengthMm + 4;
    }
    if (bar.remainMm > 0) {
      el.push(`<text x="${r(40 + barW - 4)}" y="${y + barH + 15}" font-family="Arial,sans-serif" font-size="13" text-anchor="end" fill="#a33">dư ${bar.remainMm}</text>`);
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${barW + 80}" height="${svgH}" viewBox="0 0 ${barW + 80} ${svgH}">
${el.join('\n')}
</svg>`;
}

module.exports = { drawDoorSvg, drawCuttingPlanSvg };
