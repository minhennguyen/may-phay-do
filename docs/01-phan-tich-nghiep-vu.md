# 1. Phân tích nghiệp vụ

> Đây là tài liệu quan trọng nhất. Code sai có thể sửa, hiểu sai nghiệp vụ thì phải làm lại từ đầu.

## 1.1 Phần mềm này thực chất giải bài toán gì?

Một xưởng cửa nhôm nhận yêu cầu: *"Làm cho tôi 3 bộ cửa sổ mở quay 2 cánh, kích thước
1400 × 1600, hệ Xingfa 55, màu ghi, kính hộp 5-9-5."*

Chủ xưởng phải trả lời được 3 câu hỏi, và cả ba đều đang được làm thủ công bằng Excel
hoặc máy tính cầm tay:

| Câu hỏi | Đầu ra cần có |
|---|---|
| Báo giá khách bao nhiêu? | Bảng báo giá theo m² hoặc bóc tách chi tiết |
| Cắt thanh nhôm dài bao nhiêu? | Phiếu cắt: mã thanh, chiều dài, góc cắt, số lượng |
| Mua bao nhiêu cây nhôm? | Sơ đồ phối cắt tối ưu trên cây 5.85m |

Phần mềm = **tự động hoá 3 câu trả lời đó**, cộng thêm quản lý đơn hàng và lưu lịch sử.

## 1.2 Từ điển thuật ngữ (bắt buộc thuộc)

| Thuật ngữ | Giải thích | Tên trong code |
|---|---|---|
| **Hệ nhôm** | Bộ profile tương thích nhau: Xingfa 55, 63, 65, 93; Việt Pháp; PMA; Topal; Hyundai | `system` |
| **Profile / thanh nhôm** | Thanh nhôm định hình có mã riêng, mặt cắt riêng | `profile` |
| **Khung bao (khung ngoài)** | Thanh cố định vào tường | `OUTER_FRAME` |
| **Cánh** | Khung của phần mở được | `SASH` |
| **Đố động** | Thanh đứng giữa 2 cánh mở quay, di chuyển theo cánh | `MULLION_MOVING` |
| **Đố cố định (đố chết)** | Thanh chia ô cố định, gắn vào khung bao | `MULLION_FIXED` |
| **Nẹp kính** | Thanh giữ kính, tháo được | `GLAZING_BEAD` |
| **Bóc tách** | Từ kích thước phủ bì → chiều dài cắt từng thanh | `explode` / `breakdown` |
| **Trừ hao** | Hằng số trừ đi khi cắt (do chờm mí, khe hở, ke góc) | `deduction` |
| **Phủ bì** | Kích thước ngoài cùng của bộ cửa (W × H khách đặt) | `overall` |
| **Thông thủy** | Kích thước lọt lòng ô trống | `clear opening` |
| **Cây nhôm** | Thanh nguyên chưa cắt, thường 5.85 m hoặc 6.0 m | `stock bar` |
| **Phối cắt / tối ưu** | Xếp các đoạn cần cắt vào cây sao cho ít hao nhất | `cutting stock` |
| **Máy phay đố** | Máy phay đầu đố cho khớp mặt cắt khung | CNC end-mill |
| **Ke góc** | Miếng nhôm nối 2 thanh cắt 45° | `corner cleat` |

## 1.3 Quy tắc bóc tách — phần cốt lõi

### Nguyên tắc chung

Cắt **45°** (khung bao, cánh): chiều dài đo ở **mép ngoài dài nhất**, nên
chiều dài cắt ≈ kích thước phủ bì của mặt đó.

Cắt **90°** (đố, nẹp): chiều dài = khoảng lọt lòng giữa 2 thanh kẹp nó, trừ thêm khe hở.

### Ví dụ: cửa sổ mở quay 2 cánh, hệ 55

Ký hiệu:
- `W`, `H` — rộng, cao phủ bì (mm)
- `Bk` — bề rộng cánh nhìn thấy của khung bao (mm)
- `Bc` — bề rộng cánh nhìn thấy của thanh cánh (mm)
- `Bd` — bề rộng đố động (mm)
- `c` — độ chờm cánh lên khung mỗi bên (mm)
- `k` — khe hở lắp ráp (mm)
- `n` — trừ hao nẹp kính mỗi cạnh (mm)

| Thanh | Số lượng | Chiều dài cắt | Góc |
|---|---|---|---|
| Khung bao ngang (trên, dưới) | 2 | `W` | 45° |
| Khung bao đứng (trái, phải) | 2 | `H` | 45° |
| Cánh ngang | 4 | `(W - 2·Bk + 2·c - Bd - k) / 2` | 45° |
| Cánh đứng | 4 | `H - 2·Bk + 2·c - k` | 45° |
| Đố động | 1 | `H - 2·Bk + 2·c - k` | 90° |
| Nẹp kính ngang | 4 | `Lcánh_ngang - 2·Bc + 2·n` | 45° |
| Nẹp kính đứng | 4 | `Lcánh_đứng - 2·Bc + 2·n` | 45° |

**Kính mỗi cánh:**
`Rộng = Lcánh_ngang - 2·Bc + 2·n_kính`, `Cao = Lcánh_đứng - 2·Bc + 2·n_kính`
(thường `n_kính` âm — kính nhỏ hơn lọt lòng 3–5 mm mỗi cạnh để có khe giãn nở).

> ⚠️ **Con số cụ thể của `Bk, Bc, c, k, n` khác nhau giữa từng hệ, từng nhà cung cấp,
> thậm chí từng xưởng.** Tuyệt đối **không hard-code**. Phải:
> 1. Đến xưởng, đo một bộ cửa thật đã hoàn thiện.
> 2. Giải ngược ra bộ hằng số.
> 3. Lưu vào DB, cho người dùng sửa được.
> 4. Cắt thử 1 bộ, đo lại, hiệu chỉnh.
>
> **Sai 2 mm là hỏng cả lô nhôm.** Đây là rủi ro pháp lý và uy tín lớn nhất của sản phẩm.

### Các loại cửa cần hỗ trợ (ưu tiên theo thứ tự)

1. Cửa sổ mở quay 1 cánh / 2 cánh
2. Cửa sổ mở hất
3. Vách kính cố định
4. Cửa đi mở quay 1 / 2 / 4 cánh
5. Cửa sổ mở trượt (lùa) 2 cánh / 4 cánh
6. Cửa đi mở trượt
7. Cửa xếp trượt
8. Các loại trên + **có ô phụ (fix trên / fix hông)** — đây là biến thể chiếm ~40% đơn thực tế

Nhóm 1–4 đã phủ khoảng 70% đơn hàng → làm MVP với nhóm này.

## 1.4 Vật tư ngoài nhôm

**Kính**
- Loại: cường lực 8/10/12 mm, kính hộp 5-9-5 / 5-12-5, dán an toàn, kính thường
- Đơn giá theo m², **có quy tắc tính tối thiểu** (ví dụ dưới 0.5 m² vẫn tính 0.5 m²)
- Làm tròn kích thước lên bội số 5 mm hoặc 10 mm tuỳ nhà cung cấp

**Phụ kiện** — số lượng phụ thuộc loại cửa và kích thước:
- Bản lề: 2 cái/cánh nếu cao < 2000 mm, 3 cái nếu ≥ 2000 mm
- Khoá, tay nắm, chốt đa điểm: 1 bộ/cánh mở chính
- Bánh xe (cửa trượt): 2 hoặc 4/cánh tuỳ tải trọng kính
- Ke góc: 4 cái/khung cắt 45°
- Gioăng: tính theo **mét dài** = chu vi cánh + chu vi ô kính
- Silicone: theo mét dài chu vi khung bao
- Vít, keo, nút chặn: tính theo bộ

→ Trong DB, mỗi loại cửa có bảng `template_hardware` với **công thức số lượng**
(cũng là biểu thức tính theo `W`, `H`, `số cánh`).

**Nhân công & chi phí khác**
- Công sản xuất: theo m² hoặc theo bộ
- Vận chuyển, lắp đặt
- Hao hụt vật tư: cộng % (thường 3–7%)
- Lợi nhuận: hệ số nhân cuối cùng

## 1.5 Cách tính giá — 2 chế độ, phải hỗ trợ cả hai

**Chế độ A — Báo giá nhanh theo m² (bán hàng dùng)**

```
Giá = max(W×H/1e6, diện_tích_tối_thiểu) × đơn_giá_m2_theo_loại_cửa
```
Nhanh, dùng khi tiếp khách. Đơn giá m² lấy từ bảng giá theo từng khách hàng.

**Chế độ B — Bóc tách chi tiết (chủ xưởng dùng)**

```
Giá vốn = Σ(khối_lượng_nhôm × giá_kg)      -- gồm cả phần hao do phối cắt
        + Σ(diện_tích_kính × giá_m2)
        + Σ(phụ_kiện × đơn_giá)
        + nhân_công + vận_chuyển
Giá bán = Giá vốn × (1 + %lợi_nhuận)
```

Khối lượng nhôm = `Σ(chiều_dài_m × kg_per_m của profile)`.
Giá nhôm thường tính **theo kg**, không theo mét — đây là chỗ hay tính sai nhất.

Phần mềm phải cho **so sánh 2 chế độ cạnh nhau** để chủ xưởng biết báo giá m²
đang lãi hay lỗ. Đây chính là điểm bán hàng mạnh nhất ("cân đối lợi nhuận chính xác").

## 1.6 Đầu ra cần in / xuất

| Chứng từ | Người dùng | Định dạng |
|---|---|---|
| Báo giá khách hàng | Sale → khách | PDF, Excel |
| Phiếu bóc tách chi tiết | Chủ xưởng | Excel |
| Phiếu cắt nhôm theo cây | Thợ cắt | Excel, PDF, ảnh PNG (gửi Zalo) |
| Phiếu cắt kính | Đặt hàng kính | Excel |
| Phiếu phụ kiện | Thủ kho | Excel |
| Bản vẽ bộ cửa có ghi kích thước | Thợ lắp | PNG / SVG (gửi Zalo) |
| Đơn đặt vật tư | Mua hàng | Excel |

**Gửi Zalo là yêu cầu bắt buộc ở thị trường Việt Nam.** Thợ không dùng email, không mở
PDF trên điện thoại. Phải xuất **ảnh PNG rõ nét, đọc được trên màn hình 5 inch**.

## 1.7 Ai dùng phần mềm

| Vai trò | Việc làm trên phần mềm | Thiết bị |
|---|---|---|
| Chủ xưởng | Xem tất cả, chỉnh giá, chỉnh công thức | Máy tính |
| Nhân viên báo giá | Tạo báo giá, in gửi khách | Máy tính, điện thoại |
| Quản đốc | Xem phiếu cắt, chia việc | Máy tính, máy tính bảng |
| Thợ cắt / thợ lắp | **Chỉ xem** ảnh phiếu cắt / bản vẽ | Điện thoại (Zalo) |
| Kế toán | Công nợ, doanh thu | Máy tính |

→ Phân quyền theo vai trò là bắt buộc từ Phase 3. Thợ **không được** thấy giá vốn.

## 1.8 Việc phải làm trước khi viết dòng code nào

- [ ] Xin bằng được **file Excel báo giá thật** của ít nhất 2 xưởng
- [ ] Xin **bảng công thức trừ hao** cho ít nhất 3 loại cửa
- [ ] Chụp ảnh **catalogue profile** của Xingfa 55 và 63 (có mã, kg/m, mặt cắt)
- [ ] Ngồi xem 1 buổi thợ cắt làm việc — hiểu tại sao họ cần góc cắt và ký hiệu thanh
- [ ] Hỏi 5 xưởng: *"Anh đang khó chịu nhất ở khâu nào?"* — câu trả lời sẽ định hình MVP
- [ ] Dùng thử ACT bản dùng thử, ghi lại cái gì tốt, cái gì tệ

Không có 6 gạch đầu dòng này, mọi thứ phía sau là đoán mò.
