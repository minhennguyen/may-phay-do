# 5. Lộ trình từng bước

Kế hoạch cho **1–2 lập trình viên**, làm toàn thời gian. Nhân đôi thời gian nếu làm
ngoài giờ.

Nguyên tắc xuyên suốt: **mỗi giai đoạn phải có người dùng thật dùng được**, không
chờ đến khi "xong hết" mới cho ai xem.

---

## Giai đoạn 0 — Khảo sát (1–2 tuần) · KHÔNG VIẾT CODE

Đây là giai đoạn hay bị bỏ qua nhất và cũng là giai đoạn quyết định nhất. Bỏ qua nó
thì 3 tháng sau bạn có phần mềm chạy tốt mà không ai dùng.

### Việc phải làm

- [ ] Tìm **3 xưởng cửa nhôm** chịu nói chuyện. Ưu tiên xưởng quy mô 10–30 người —
      đủ lớn để có nhu cầu, đủ nhỏ để chủ tự quyết mua.
- [ ] Xin **file Excel báo giá thật** đang dùng. Đây là bản đặc tả tốt nhất bạn có
      thể có, và nó miễn phí.
- [ ] Xin **bảng hằng số trừ hao** cho ít nhất 3 loại cửa. Nếu họ không có văn bản,
      ngồi xem thợ tính và ghi lại.
- [ ] Chụp **catalogue profile** Xingfa 55 và 63: mã thanh, kg/m, mặt cắt.
- [ ] Ngồi **1 buổi ở xưởng** xem thợ cắt làm việc.
- [ ] Hỏi mỗi chủ xưởng: *"Anh mất thời gian nhất ở khâu nào?"*
- [ ] Dùng thử **ACT** và các đối thủ. Ghi lại điểm mạnh, điểm yếu.
- [ ] Viết ra **một câu** trả lời: *phần mềm của tôi hơn ACT ở điểm gì?*

### Tiêu chí hoàn thành

Bạn tự bóc tách được **bằng tay trên giấy** một bộ cửa mở quay 2 cánh, và thợ ở
xưởng xác nhận số của bạn đúng.

Chưa làm được điều đó thì đừng viết code — bạn đang chuẩn bị tự động hoá một quy
trình bạn chưa hiểu.

---

## Giai đoạn 1 — Lõi bóc tách (2–3 tuần)

**Mục tiêu:** nhập rộng × cao → ra bảng cắt đúng. Chưa cần giao diện đẹp, chưa cần
CSDL.

### Bước 1.1 — Engine công thức
- [ ] Viết tokenizer + parser + evaluator (xem `prototype/formula.js`)
- [ ] **Không dùng `eval`**
- [ ] Viết test cho: phép tính, biến thiếu, chia 0, toán tử ba ngôi
- [ ] Hàm `variablesUsed()` để kiểm tra công thức lúc lưu

### Bước 1.2 — Mô hình dữ liệu trong bộ nhớ
- [ ] Khai báo hệ nhôm, profile, mẫu cửa dưới dạng object (xem `prototype/data.js`)
- [ ] Nhập **hằng số thật** lấy từ Giai đoạn 0, không dùng số minh hoạ

### Bước 1.3 — Hàm bóc tách
- [ ] `explodeDoor({templateCode, W, H, qty, finish, glass})`
- [ ] Thanh sau tham chiếu được thanh trước (theo `sortOrder`)
- [ ] Kính làm tròn lên, áp diện tích tối thiểu
- [ ] Phụ kiện: đếm được → `ceil`, đo được → 2 số lẻ
- [ ] Kiểm tra đầu vào, báo lỗi tiếng Việt rõ nghĩa

### Bước 1.4 — ⭐ Kiểm chứng ngoài đời
- [ ] Chạy phần mềm ra bảng cắt cho 5 bộ cửa
- [ ] Mang đến xưởng, đối chiếu với số thợ tính tay
- [ ] Sai chỗ nào → sửa **hằng số**, không sửa công thức
- [ ] Cắt thử **1 bộ thật**, lắp lên, đo lại

> Bước 1.4 là bước quan trọng nhất trong toàn bộ dự án. Đừng đi tiếp khi chưa có
> một bộ cửa thật lắp vừa.

**Nghiệm thu giai đoạn 1:** một bộ cửa cắt theo số phần mềm, lắp vừa khít.

---

## Giai đoạn 2 — Tối ưu cắt + bản vẽ (2 tuần)

### Bước 2.1 — Thuật toán tối ưu
- [ ] Best Fit Decreasing + đa phương án (xem `prototype/optimize.js`)
- [ ] Cộng kerf 4 mm mỗi đoạn
- [ ] Gom nhóm theo `profileCode + finishCode`
- [ ] Kết quả **tất định** — không dùng `Math.random()`
- [ ] Test: không nhồi quá cây, không mất đoạn, hao < 10%

### Bước 2.2 — Đầu thừa tồn kho
- [ ] Nhận danh sách đầu thừa, dùng trước khi mở cây nguyên
- [ ] Trả về danh sách đầu thừa mới sinh (> 500 mm)

### Bước 2.3 — Bản vẽ
- [ ] Sinh SVG mặt đứng bộ cửa có ghi kích thước
- [ ] Sinh SVG sơ đồ phối cắt từng cây
- [ ] Đổi SVG → PNG bằng `@resvg/resvg-js`
- [ ] **Gửi thử qua Zalo, mở trên điện thoại** — đọc được không? Chữ đủ to chưa?

### Bước 2.4 — Xuất Excel
- [ ] Phiếu cắt nhôm (`exceljs`)
- [ ] Phiếu kính
- [ ] Phiếu phụ kiện

**Nghiệm thu giai đoạn 2:** thợ cắt cả một đơn hàng chỉ bằng phiếu phần mềm in ra,
không hỏi lại câu nào.

---

## Giai đoạn 3 — Tính giá + báo giá (2 tuần)

- [ ] Giá nhôm **theo kg** (không theo mét)
- [ ] Giá kính theo m², có mức tối thiểu
- [ ] Phụ kiện, nhân công, hao hụt, lợi nhuận
- [ ] Chế độ báo nhanh theo m²
- [ ] ⭐ **So sánh 2 chế độ cạnh nhau + cảnh báo lỗ** — đây là tính năng bán được hàng
- [ ] Xuất báo giá PDF có logo công ty khách hàng
- [ ] Bảng giá riêng cho từng khách

**Nghiệm thu:** chủ xưởng nhìn màn hình so sánh và nói *"hoá ra tôi đang lỗ ở loại
cửa này"*. Lúc đó bạn bán được phần mềm.

---

## Giai đoạn 4 — Đưa lên web (3–4 tuần)

### Bước 4.1 — CSDL
- [ ] PostgreSQL + Prisma, chuyển toàn bộ danh mục từ file sang bảng
- [ ] Seed idempotent (dùng `upsert`)
- [ ] Cột `tenant_id` trên mọi bảng nghiệp vụ ngay từ đầu

### Bước 4.2 — API
- [ ] Đăng nhập bằng **số điện thoại** (không phải email)
- [ ] CRUD danh mục, mẫu cửa, báo giá
- [ ] Endpoint bóc tách / tối ưu / xuất file
- [ ] Middleware ép `tenant_id` ở tầng thấp nhất

### Bước 4.3 — Giao diện
- [ ] Màn hình lập báo giá: thêm dòng, chọn mẫu, nhập W×H, xem ngay bản vẽ
- [ ] Màn hình sửa công thức mẫu cửa — **có xem trước kết quả tức thì**
- [ ] Màn hình bảng giá
- [ ] Màn hình phiếu cắt
- [ ] **Dùng được trên điện thoại** — chủ xưởng báo giá tại công trình

### Bước 4.4 — Vận hành
- [ ] Sao lưu tự động hằng ngày + **thử phục hồi một lần**
- [ ] Ghi log lỗi (Sentry hoặc tương đương)
- [ ] `audit_log` cho thao tác sửa công thức và bảng giá

**Nghiệm thu:** một xưởng dùng thật, lập báo giá thật cho khách thật, trong 2 tuần
liền không quay lại Excel.

---

## Giai đoạn 5 — Đa công ty + thuê bao (3 tuần)

- [ ] Đăng ký tài khoản, tạo công ty mới
- [ ] Sao chép danh mục gốc cho tenant mới (copy-on-write)
- [ ] Phân quyền: chủ / báo giá / quản đốc / thợ / kế toán
- [ ] Thợ **không thấy giá vốn** — kiểm tra kỹ điều này
- [ ] Gói thuê bao, ngày hết hạn, nhắc gia hạn
- [ ] Thanh toán: chuyển khoản VietQR trước, cổng thanh toán sau
- [ ] Bật Row Level Security, **test rò rỉ chéo tenant**

> Trước khi mở bán, tự tạo 2 tài khoản công ty khác nhau và cố tìm cách xem dữ liệu
> của nhau. Rò một lần là mất toàn bộ uy tín.

---

## Giai đoạn 6 — Mở rộng (liên tục)

Xếp theo thứ tự giá trị mang lại:

| Ưu tiên | Tính năng | Vì sao |
|---|---|---|
| 1 | **Thêm loại cửa**: trượt, xếp trượt, cửa có ô fix | Phủ nốt 30% đơn hàng còn lại |
| 2 | **Quản lý đơn hàng & tiến độ** | Chủ xưởng hỏi "đơn này đến đâu rồi" mỗi ngày |
| 3 | **Kho vật tư + đầu thừa** | Tiết kiệm tiền thật, dễ chứng minh |
| 4 | **Công nợ khách hàng** | Kế toán sẽ đòi |
| 5 | **Xuất file cho máy CNC** (máy cắt 2 đầu, máy phay đố, máy khoan) | Xưởng lớn mới cần, nhưng họ trả tiền cao |
| 6 | **App di động thật** (React Native) | PWA đủ dùng khá lâu |
| 7 | Trình vẽ kéo–thả tự chia ô | Trông ấn tượng nhưng ít người dùng thật |

Mục 7 rất hay bị làm sớm vì nó đẹp khi demo. Đừng. Trong thực tế 90% đơn hàng dùng
mẫu có sẵn; trình vẽ tự do tốn 2 tháng công cho 10% trường hợp.

---

## Tổng thời gian

| Giai đoạn | Thời gian | Cộng dồn |
|---|---|---|
| 0 — Khảo sát | 1–2 tuần | 2 tuần |
| 1 — Lõi bóc tách | 2–3 tuần | 5 tuần |
| 2 — Tối ưu + bản vẽ | 2 tuần | 7 tuần |
| 3 — Tính giá | 2 tuần | 9 tuần |
| 4 — Web | 3–4 tuần | 13 tuần |
| 5 — SaaS | 3 tuần | 16 tuần |

**Khoảng 4 tháng** để có sản phẩm bán được. Cộng 30–50% cho việc phát sinh — thực tế
là **5–6 tháng**.

---

## Bảy sai lầm khiến dự án loại này chết

1. **Bỏ qua Giai đoạn 0.** Viết 3 tháng code cho một quy trình mình đoán ra.
2. **Hard-code công thức trong code.** Xưởng thứ hai có hằng số khác → phải sửa code
   và deploy lại cho từng khách. Không mở rộng được.
3. **Dùng `eval()` cho công thức.** Lỗ hổng RCE, mất toàn bộ dữ liệu khách hàng.
4. **Dùng số thực cho tiền.** Sai lệch từng đồng, kế toán phát hiện, mất niềm tin.
5. **Làm giao diện đẹp trước khi tính đúng.** Không ai mua phần mềm sai kích thước,
   dù nó đẹp đến đâu.
6. **Không lưu `snapshot` cho báo giá.** Giá nhôm tăng, báo giá cũ tự nhảy số, cãi
   nhau với khách.
7. **Không có bản vẽ gửi Zalo.** Thợ không dùng, xưởng quay về giấy, phần mềm bị bỏ.

---

## Cách chạy prototype trong repo này

```bash
node prototype/test.js    # 38 test cho phần lõi
node prototype/demo.js    # mô phỏng trọn vẹn một đơn hàng
```

Prototype đã cài đặt xong Bước 1.1 → 2.3 và Giai đoạn 3. Việc của bạn là **thay số
minh hoạ trong `prototype/data.js` bằng số thật của xưởng**, rồi bắt đầu từ Bước 1.4
— mang ra xưởng kiểm chứng.
