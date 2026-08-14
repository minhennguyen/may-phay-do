# 4. Thuật toán lõi

Ba thuật toán quyết định phần mềm này thành hay bại. Toàn bộ đã được cài đặt chạy
được trong `prototype/` — đọc song song với code.

---

## 4.1 Engine công thức — `prototype/formula.js`

### Vấn đề

Công thức bóc tách **không được hard-code**. Mỗi xưởng có hằng số trừ hao riêng, và
họ phải sửa được qua giao diện mà không cần gọi bạn.

Nghĩa là công thức phải lưu trong CSDL dưới dạng **chuỗi**:

```
"(W - 2*Bk + 2*c - Bd - k) / 2"
```

rồi được tính lúc chạy với `W`, `H` và bộ hằng số của hệ.

### Cạm bẫy chết người: đừng dùng `eval()`

```js
// ❌ TUYỆT ĐỐI KHÔNG
const length = eval(part.lengthExpr);
```

Chuỗi này đến từ CSDL, mà CSDL nhận dữ liệu từ người dùng. Một tenant nhập
`process.env.DATABASE_URL` hoặc `require('fs').readFileSync('/etc/passwd')` là đọc
được toàn bộ server. Đây là lỗ hổng thực thi mã từ xa (RCE).

`new Function()` cũng không an toàn hơn.

### Giải pháp: parser riêng, ~250 dòng

Tự viết bộ phân tích cú pháp chỉ hiểu số, biến và toán tử. Không có `require`,
không có truy cập thuộc tính, không có gì chạm tới hệ thống.

Ba bước kinh điển:

```
chuỗi  →  [tokenize]  →  danh sách token  →  [parse]  →  cây AST  →  [evaluate]  →  số
```

Ngữ pháp (đệ quy xuống, ưu tiên toán tử từ thấp đến cao):

```
ternary := or ( '?' ternary ':' ternary )?
or      := and ( '||' and )*
and     := cmp ( '&&' cmp )*
cmp     := add ( ('>='|'<='|'>'|'<'|'=='|'!=') add )*
add     := mul ( ('+'|'-') mul )*
mul     := unary ( ('*'|'/'|'%') unary )*
unary   := ('-'|'+')? primary
primary := số | biến | hàm '(' args ')' | '(' ternary ')'
```

Cache AST theo chuỗi công thức — một mẫu cửa được tính hàng nghìn lần, không nên
parse lại mỗi lần.

### Tính năng bắt buộc phải có

| Tính năng | Vì sao |
|---|---|
| Báo lỗi nêu rõ **tên biến thiếu** và **danh sách biến khả dụng** | Người dùng tự sửa được công thức sai, không phải gọi hỗ trợ |
| Chia cho 0 → **ném lỗi**, không trả `Infinity` | `Infinity` sẽ âm thầm lan thành `NaN` rồi thành phiếu cắt rác |
| Hàm `variablesUsed()` | Kiểm tra công thức **ngay lúc người dùng bấm Lưu**, không đợi đến lúc in phiếu |
| Toán tử ba ngôi `? :` | Quy tắc thực tế cần nó: `sash * (H >= 2000 ? 3 : 2)` |

---

## 4.2 Bóc tách bộ cửa — `prototype/explode.js`

### Luồng xử lý

```
input {mẫu, W, H, số bộ, màu, kính}
   │
   ├─ nạp scope = { W, H, sash, ...hằng_số_của_hệ }
   │
   ├─ với mỗi thanh, THEO ĐÚNG THỨ TỰ sortOrder:
   │     lengthMm = evalMm(lengthExpr, scope)
   │     scope[key] = lengthMm      ← ⭐ thanh sau tham chiếu được thanh trước
   │
   ├─ kính:     làm tròn LÊN bội số, áp diện tích tối thiểu
   └─ phụ kiện: đơn vị đếm được → ceil; đơn vị đo được → giữ 2 số lẻ
```

### Vì sao thứ tự quan trọng

Nẹp kính tính từ chiều dài cánh, không tính từ `W`:

```
canh_ngang = (W - 2*Bk + 2*c - Bd - k) / 2      ← order 4
nep_ngang  = canh_ngang - 2*Bc + 2*n            ← order 6, dùng lại kết quả trên
```

Nhờ vậy khi người dùng sửa công thức cánh, nẹp kính tự đúng theo. Nếu viết lại toàn
bộ biểu thức từ `W` cho mỗi thanh thì sửa một chỗ phải sửa năm chỗ, và chắc chắn sẽ
quên một chỗ.

### Kiểm tra đầu vào — đây là tính năng, không phải phiền hà

```
W < 300 hoặc H < 300           → chặn, quá nhỏ
W > 6000 hoặc H > 4000         → chặn, phải chia khoang và ghép adapter
W / số_cánh > 900              → chặn, cánh mở quay quá rộng sẽ xệ bản lề
bất kỳ chiều dài nào ≤ 0       → chặn, kèm gợi ý "hằng số trừ hao có thể sai"
```

Cái chặn thứ ba là **kiến thức nghề** mà phần mềm đối thủ thường không có. Nó cứu
khách hàng khỏi làm ra bộ cửa hỏng. Hãy đưa nhiều luật kiểu này vào — đó là thứ
khiến chủ xưởng tin phần mềm.

### Làm tròn kính — luôn làm tròn LÊN

```js
const widthMm  = Math.ceil(rawW / roundTo) * roundTo;
const heightMm = Math.ceil(rawH / roundTo) * roundTo;
```

Làm tròn xuống → kính nhỏ hơn ô → lắp vào bị rơi. Làm tròn lên → mài bớt được.
**Luôn thiên về phía sửa được.** Nguyên tắc này áp cho mọi phép làm tròn trong hệ
thống: chọn hướng mà sai số còn cứu được.

---

## 4.3 Tối ưu cắt phôi — `prototype/optimize.js`

### Bài toán

Có 12 đoạn 1510 mm, 12 đoạn 625 mm, 6 đoạn 1400 mm… cắt từ cây 5850 mm.
Dùng ít cây nhất.

Đây là bài toán **cutting stock 1 chiều**, thuộc lớp NP-hard. Không có thuật toán
nhanh cho lời giải tối ưu tuyệt đối, nhưng **không cần tối ưu tuyệt đối** — chỉ cần
tốt hơn thợ xếp tay là đã ra tiền:

| Cách làm | Hao hụt điển hình |
|---|---|
| Thợ xếp tay | 12 – 18 % |
| First Fit Decreasing | 6 – 9 % |
| Best Fit Decreasing + đa phương án | 3 – 7 % |
| Tối ưu tuyệt đối (column generation) | 2 – 6 % |

Chênh giữa hàng 1 và hàng 3 là khoảng **10% chi phí nhôm**. Với xưởng mua 200 triệu
nhôm/tháng, đó là **20 triệu/tháng**. Đây là con số bạn dùng để bán phần mềm.

### Thuật toán đã cài

**Best Fit Decreasing + đa phương án ngẫu nhiên:**

1. Sắp các đoạn giảm dần theo chiều dài
2. Với mỗi đoạn, đặt vào cây có **phần dư nhỏ nhất mà vẫn chứa được**
   (khác First Fit — chọn cây *đầu tiên* chứa được; Best Fit chặt hơn)
3. Hết cây thì mở cây mới
4. Lặp lại 60–80 lần, mỗi lần **xáo trộn nhẹ** thứ tự trong nhóm chiều dài gần nhau
5. Giữ phương án ít cây nhất; đồng hạng thì giữ phương án ít hao nhất

Bước 4 quan trọng: BFD thuần là thuật toán tham lam, dễ kẹt ở cực trị cục bộ. Xáo
trộn nhẹ rồi chạy lại nhiều lần thoát ra được, mà vẫn chạy dưới 100 ms.

### Ba chi tiết thực tế mà bản mô phỏng lý thuyết hay bỏ sót

**1. Bề rộng lưỡi cắt (kerf)**

Mỗi nhát cắt ăn mất 3–5 mm nhôm. Bỏ qua thì tính ra vừa khít nhưng thực tế cắt
thiếu. Luôn cộng kerf vào mỗi đoạn:

```js
const need = piece.lengthMm + kerfMm;
```

**2. Chỉ gộp cắt chung khi CÙNG mã profile VÀ CÙNG màu**

Thanh khung bao màu ghi và khung bao màu trắng là **hai vật tư khác nhau**, không
bao giờ cắt chung một cây. Hàm `groupForCutting()` gom theo khoá
`profileCode::finishCode`.

**3. Tận dụng đầu thừa tồn kho (remnant)**

Đoạn dư > 500 mm được cất lại dùng cho đơn sau. Thuật toán nhận danh sách đầu thừa
và **dùng hết chúng trước khi mở cây nguyên**:

```js
optimizeCutting(demands, { remnantsMm: [1600, 2100, 890] })
```

Rất ít phần mềm trên thị trường làm việc này. Nó tiết kiệm tiền thật và là điểm
khác biệt dễ demo — chủ xưởng nào cũng có một góc kho đầy đầu thừa.

### Kết quả phải TẤT ĐỊNH

```js
// xorshift32 với hạt giống cố định, không dùng Math.random()
let rngState = 0x2f6e2b1 >>> 0;
```

Vì sao: thợ in phiếu cắt, làm mất, in lại — **phải ra đúng phiếu cũ**. Nếu mỗi lần
in ra một phương án khác, thợ sẽ cắt nhầm theo phiếu cũ đang cầm dở. `Math.random()`
biến phần mềm thành nguồn gây lỗi sản xuất.

### Khi nào cần nâng cấp

Thuật toán hiện tại đủ dùng đến khoảng vài trăm đoạn mỗi nhóm. Nếu cần tốt hơn:

- **Column generation / Gilmore–Gomory** — lời giải tối ưu thật, nhưng cần thư viện
  quy hoạch tuyến tính (`glpk.js`, hoặc gọi CBC/HiGHS qua tiến trình con)
- **Cắt kính 2 chiều (2D guillotine)** — bài toán khác hẳn, khó hơn nhiều. Chỉ làm
  khi khách hàng tự cắt kính; đa số xưởng đặt kính cắt sẵn theo kích thước.

Đừng làm hai thứ này ở giai đoạn đầu. Chênh lệch 3–7% xuống 2–6% không đủ trả cho
vài tuần công.

---

## 4.4 Sinh bản vẽ — `prototype/draw.js`

Xuất **SVG** (văn bản thuần, không cần thư viện), rồi đổi sang PNG bằng
`@resvg/resvg-js` để gửi Zalo.

Quy tắc thiết kế cho bản vẽ gửi thợ:

- **Nền trắng đặc.** Zalo nén ảnh; nền trong suốt sẽ thành đen.
- **Chữ ≥ 20 px** cho số kích thước. Thợ xem trên điện thoại 5 inch, ngoài công trường, nắng.
- **Nét đậm** (`stroke-width` 1.5–3). Nét mảnh biến mất sau khi nén.
- **Chỉ hiện thông tin cần thiết.** Bản vẽ đẹp mà rối thì thợ đo nhầm.
- Ghi **mã dòng báo giá** (`D1`, `D2`) lên cả bản vẽ và phiếu cắt để đối chiếu.

Trên phiếu cắt phải ghi **góc cắt** (45° / 90°) cạnh từng đoạn — thợ cần biết để
chỉnh máy cắt hai đầu.
