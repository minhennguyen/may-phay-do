'use strict';
/**
 * Dữ liệu mồi (seed) minh hoạ.
 *
 * ⚠️ TẤT CẢ CON SỐ Ở ĐÂY LÀ SỐ MINH HOẠ, KHÔNG PHẢI SỐ THẬT.
 *    Phải lấy hằng số trừ hao và bảng giá từ xưởng thật rồi hiệu chuẩn
 *    bằng cách cắt thử một bộ cửa. Xem docs/01-phan-tich-nghiep-vu.md mục 1.3.
 */

const systems = {
  XINGFA55: {
    code: 'XINGFA55',
    name: 'Xingfa 55 — hệ mở quay',
    stockLengthMm: 5850,
    /** Hằng số trừ hao. Người dùng phải sửa được qua giao diện. */
    constants: {
      Bk: 55,   // bề rộng nhìn thấy của khung bao
      Bc: 55,   // bề rộng nhìn thấy của thanh cánh
      Bd: 60,   // bề rộng đố động
      Bf: 55,   // bề rộng đố cố định
      c: 12,    // độ chờm cánh lên khung, mỗi bên
      k: 4,     // khe hở lắp ráp
      n: 2,     // trừ hao nẹp kính, mỗi cạnh
      g: -4,    // trừ hao kính mỗi cạnh (âm = kính nhỏ hơn lọt lòng)
    },
  },
};

const profiles = {
  'XF55-KB': { code: 'XF55-KB', name: 'Khung bao 55',    system: 'XINGFA55', role: 'OUTER_FRAME',    gramPerM: 1180, visibleWidthMm: 55 },
  'XF55-CA': { code: 'XF55-CA', name: 'Cánh 55',         system: 'XINGFA55', role: 'SASH',           gramPerM: 1350, visibleWidthMm: 55 },
  'XF55-DD': { code: 'XF55-DD', name: 'Đố động 55',      system: 'XINGFA55', role: 'MULLION_MOVING', gramPerM: 1420, visibleWidthMm: 60 },
  'XF55-DC': { code: 'XF55-DC', name: 'Đố cố định 55',   system: 'XINGFA55', role: 'MULLION_FIXED',  gramPerM: 1250, visibleWidthMm: 55 },
  'XF55-NK': { code: 'XF55-NK', name: 'Nẹp kính 55',     system: 'XINGFA55', role: 'GLAZING_BEAD',   gramPerM:  320, visibleWidthMm: 18 },
};

const finishes = {
  TRANG: { code: 'TRANG', name: 'Trắng sứ', priceMultiplier: 1.00 },
  GHI:   { code: 'GHI',   name: 'Ghi',      priceMultiplier: 1.00 },
  DEN:   { code: 'DEN',   name: 'Đen',      priceMultiplier: 1.05 },
  VANGO: { code: 'VANGO', name: 'Vân gỗ',   priceMultiplier: 1.18 },
};

/** Giá nhôm tính theo KG, không phải theo mét. Đây là chỗ hay tính sai nhất. */
const aluPricePerKg = 85_000;

const glassTypes = {
  'H595': { code: 'H595', name: 'Kính hộp 5-9-5',      thicknessMm: 19, pricePerM2: 480_000, minAreaMm2: 500_000, roundToMm: 5 },
  'CL8':  { code: 'CL8',  name: 'Cường lực 8mm',        thicknessMm:  8, pricePerM2: 420_000, minAreaMm2: 500_000, roundToMm: 5 },
  'T5':   { code: 'T5',   name: 'Kính thường 5mm',      thicknessMm:  5, pricePerM2: 190_000, minAreaMm2: 400_000, roundToMm: 5 },
};

const hardware = {
  BANLE:  { code: 'BANLE',  name: 'Bản lề 3D',        unit: 'CAI', price:  45_000 },
  KHOA:   { code: 'KHOA',   name: 'Khoá đa điểm',     unit: 'BO',  price: 180_000 },
  TAYNAM: { code: 'TAYNAM', name: 'Tay nắm',          unit: 'CAI', price:  65_000 },
  CHOT:   { code: 'CHOT',   name: 'Chốt đa điểm',     unit: 'CAI', price:  35_000 },
  KEGOC:  { code: 'KEGOC',  name: 'Ke góc',           unit: 'CAI', price:   3_500 },
  GIOANG: { code: 'GIOANG', name: 'Gioăng cao su',    unit: 'MET', price:   4_500 },
  SILI:   { code: 'SILI',   name: 'Silicone',         unit: 'MET', price:  12_000 },
  VIT:    { code: 'VIT',    name: 'Vít + phụ kiện lẻ',unit: 'BO',  price:  25_000 },
};

/**
 * Mẫu cửa. `lengthExpr` là CHUỖI lưu trong CSDL — người dùng sửa được.
 * Biến khả dụng: W, H, sash, mọi khoá trong system.constants,
 * và `key` của các thanh đã tính trước đó (nhờ sortOrder).
 */
const templates = {
  FIX: {
    code: 'FIX',
    name: 'Vách kính cố định',
    system: 'XINGFA55',
    sashCount: 0,
    drawingKind: 'fix',
    parts: [
      { key: 'khung_ngang', label: 'Khung bao ngang', profile: 'XF55-KB', qtyExpr: '2', lengthExpr: 'W', angle: 'A45', order: 1 },
      { key: 'khung_dung',  label: 'Khung bao đứng',  profile: 'XF55-KB', qtyExpr: '2', lengthExpr: 'H', angle: 'A45', order: 2 },
      { key: 'nep_ngang',   label: 'Nẹp kính ngang',  profile: 'XF55-NK', qtyExpr: '2', lengthExpr: 'W - 2*Bk + 2*n', angle: 'A45', order: 3 },
      { key: 'nep_dung',    label: 'Nẹp kính đứng',   profile: 'XF55-NK', qtyExpr: '2', lengthExpr: 'H - 2*Bk + 2*n', angle: 'A45', order: 4 },
    ],
    glass: [
      { label: 'Kính ô cố định', qtyExpr: '1', widthExpr: 'W - 2*Bk + 2*g', heightExpr: 'H - 2*Bk + 2*g' },
    ],
    hardware: [
      { code: 'KEGOC',  qtyExpr: '4' },
      { code: 'GIOANG', qtyExpr: '2 * (W + H) / 1000' },
      { code: 'SILI',   qtyExpr: '2 * (W + H) / 1000' },
      { code: 'VIT',    qtyExpr: '1' },
    ],
  },

  MQ1C: {
    code: 'MQ1C',
    name: 'Cửa sổ mở quay 1 cánh',
    system: 'XINGFA55',
    sashCount: 1,
    drawingKind: 'casement',
    parts: [
      { key: 'khung_ngang', label: 'Khung bao ngang', profile: 'XF55-KB', qtyExpr: '2', lengthExpr: 'W', angle: 'A45', order: 1 },
      { key: 'khung_dung',  label: 'Khung bao đứng',  profile: 'XF55-KB', qtyExpr: '2', lengthExpr: 'H', angle: 'A45', order: 2 },
      { key: 'canh_ngang',  label: 'Cánh ngang',      profile: 'XF55-CA', qtyExpr: '2', lengthExpr: 'W - 2*Bk + 2*c - k', angle: 'A45', order: 3 },
      { key: 'canh_dung',   label: 'Cánh đứng',       profile: 'XF55-CA', qtyExpr: '2', lengthExpr: 'H - 2*Bk + 2*c - k', angle: 'A45', order: 4 },
      { key: 'nep_ngang',   label: 'Nẹp kính ngang',  profile: 'XF55-NK', qtyExpr: '2', lengthExpr: 'canh_ngang - 2*Bc + 2*n', angle: 'A45', order: 5 },
      { key: 'nep_dung',    label: 'Nẹp kính đứng',   profile: 'XF55-NK', qtyExpr: '2', lengthExpr: 'canh_dung - 2*Bc + 2*n',  angle: 'A45', order: 6 },
    ],
    glass: [
      { label: 'Kính cánh', qtyExpr: '1', widthExpr: 'canh_ngang - 2*Bc + 2*g', heightExpr: 'canh_dung - 2*Bc + 2*g' },
    ],
    hardware: [
      { code: 'BANLE',  qtyExpr: 'sash * (H >= 2000 ? 3 : 2)' },
      { code: 'KHOA',   qtyExpr: 'sash' },
      { code: 'TAYNAM', qtyExpr: 'sash' },
      { code: 'KEGOC',  qtyExpr: '4 + sash * 4' },
      { code: 'GIOANG', qtyExpr: '2 * (canh_ngang + canh_dung) * sash / 1000' },
      { code: 'SILI',   qtyExpr: '2 * (W + H) / 1000' },
      { code: 'VIT',    qtyExpr: '1' },
    ],
  },

  MQ2C: {
    code: 'MQ2C',
    name: 'Cửa sổ mở quay 2 cánh',
    system: 'XINGFA55',
    sashCount: 2,
    drawingKind: 'casement',
    parts: [
      { key: 'khung_ngang', label: 'Khung bao ngang', profile: 'XF55-KB', qtyExpr: '2', lengthExpr: 'W', angle: 'A45', order: 1 },
      { key: 'khung_dung',  label: 'Khung bao đứng',  profile: 'XF55-KB', qtyExpr: '2', lengthExpr: 'H', angle: 'A45', order: 2 },
      { key: 'canh_dung',   label: 'Cánh đứng',       profile: 'XF55-CA', qtyExpr: '4', lengthExpr: 'H - 2*Bk + 2*c - k', angle: 'A45', order: 3 },
      { key: 'canh_ngang',  label: 'Cánh ngang',      profile: 'XF55-CA', qtyExpr: '4', lengthExpr: '(W - 2*Bk + 2*c - Bd - k) / 2', angle: 'A45', order: 4 },
      { key: 'do_dong',     label: 'Đố động',         profile: 'XF55-DD', qtyExpr: '1', lengthExpr: 'H - 2*Bk + 2*c - k', angle: 'A90', order: 5 },
      { key: 'nep_ngang',   label: 'Nẹp kính ngang',  profile: 'XF55-NK', qtyExpr: '4', lengthExpr: 'canh_ngang - 2*Bc + 2*n', angle: 'A45', order: 6 },
      { key: 'nep_dung',    label: 'Nẹp kính đứng',   profile: 'XF55-NK', qtyExpr: '4', lengthExpr: 'canh_dung - 2*Bc + 2*n',  angle: 'A45', order: 7 },
    ],
    glass: [
      { label: 'Kính cánh', qtyExpr: 'sash', widthExpr: 'canh_ngang - 2*Bc + 2*g', heightExpr: 'canh_dung - 2*Bc + 2*g' },
    ],
    hardware: [
      { code: 'BANLE',  qtyExpr: 'sash * (H >= 2000 ? 3 : 2)' },
      { code: 'KHOA',   qtyExpr: '1' },
      { code: 'TAYNAM', qtyExpr: '1' },
      { code: 'CHOT',   qtyExpr: '1' },
      { code: 'KEGOC',  qtyExpr: '4 + sash * 4' },
      { code: 'GIOANG', qtyExpr: '2 * (canh_ngang + canh_dung) * sash / 1000' },
      { code: 'SILI',   qtyExpr: '2 * (W + H) / 1000' },
      { code: 'VIT',    qtyExpr: '1' },
    ],
  },
};

/** Tham số tính giá của xưởng. */
const settings = {
  wastePercent: 5,        // hao hụt vật tư cộng thêm
  markupPercent: 35,      // lợi nhuận
  laborPerM2: 180_000,    // công sản xuất theo m²
  /** Đơn giá báo nhanh theo m², dùng cho chế độ PER_M2. */
  pricePerM2: {
    FIX:  1_450_000,
    MQ1C: 2_350_000,
    MQ2C: 2_500_000,
  },
  minAreaM2: 1.0,         // dưới mức này vẫn tính bằng mức này
};

module.exports = {
  systems, profiles, finishes, glassTypes, hardware, templates, settings, aluPricePerKg,
};
