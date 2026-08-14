# 6. Kinh doanh & vận hành

Phần mềm đúng kỹ thuật mà không bán được thì vẫn là dự án thất bại. Phần này quan
trọng ngang phần code.

## 6.1 Thị trường

Đối thủ chính tại Việt Nam:

| Sản phẩm | Điểm mạnh | Điểm yếu khai thác được |
|---|---|---|
| **ACT** (phanmemcua.com) | Có sẵn nhiều mẫu, có app, đã có tệp khách | Giao diện cũ, ít tuỳ biến sâu |
| **Window Star** | Lâu năm, đầy đủ | Nặng, khó dùng, thiên desktop |
| **iWindow** | Miễn phí, kéo thả dễ | Sơ sài, không quản lý được sản xuất |
| **Excel tự làm** | Miễn phí, chủ xưởng tự kiểm soát | Không tối ưu cắt, dễ sai, không chia sẻ được |

**Đối thủ lớn nhất không phải ACT — mà là Excel.** Phần lớn xưởng đang dùng Excel và
thấy "cũng ổn". Bạn phải hơn Excel đủ rõ để họ chịu đổi thói quen.

### Ba chỗ nên chọn để hơn

1. **Tối ưu cắt + tận dụng đầu thừa** — quy ra tiền được ngay, dễ chứng minh
2. **Cảnh báo lỗ khi báo giá theo m²** — chạm đúng nỗi sợ của chủ xưởng
3. **Sửa công thức được, không cần gọi kỹ thuật** — mỗi xưởng có cách trừ hao riêng

Đừng cạnh tranh bằng "nhiều mẫu cửa hơn" — đó là cuộc đua bạn không thắng được trong
năm đầu.

## 6.2 Giá bán

Tham chiếu thị trường: khoảng 200.000 – 500.000 đ/tháng cho một xưởng nhỏ.

Gợi ý cơ cấu gói:

| Gói | Giá/tháng | Giới hạn |
|---|---|---|
| Dùng thử | 0 đ, 14 ngày | Đủ tính năng, giới hạn 10 báo giá |
| Cơ bản | 299.000 đ | 1 người dùng, không tối ưu cắt |
| Chuyên nghiệp | 599.000 đ | 5 người dùng, đủ tính năng |
| Xưởng lớn | 1.500.000 đ | Không giới hạn, xuất file CNC, hỗ trợ riêng |

Ba nguyên tắc định giá cho thị trường này:

- **Trả theo năm giảm 20%.** Dòng tiền trước, và giảm tỉ lệ bỏ dùng.
- **Cài đặt và hỗ trợ miễn phí.** ACT đang làm vậy; không miễn phí là mất lợi thế.
- **Đừng tính tiền theo số bản vẽ.** Chủ xưởng ghét bị đếm; họ sẽ dùng dè dặt rồi bỏ.

Định giá bằng câu chuyện tiết kiệm, không bằng danh sách tính năng:

> *"Xưởng anh mua 200 triệu nhôm/tháng. Giảm hao từ 15% xuống 6% là tiết kiệm
> 18 triệu/tháng. Phần mềm 599 nghìn."*

## 6.3 Cách bán

Ngành này **không mua qua quảng cáo online**. Kênh hiệu quả theo thứ tự:

1. **Đại lý nhôm giới thiệu** — họ quen tất cả xưởng trong vùng. Chia hoa hồng 20–30%.
   Đây là kênh mạnh nhất, hãy đầu tư vào đây trước.
2. **Nhóm Zalo / Facebook nghề cửa nhôm** — tham gia, trả lời câu hỏi kỹ thuật thật
   trong vài tháng trước khi nhắc đến sản phẩm.
3. **Đến tận xưởng demo** — 30 phút, bóc tách ngay một bộ cửa họ đang làm dở.
4. **Giới thiệu truyền miệng** — thưởng 1 tháng miễn phí cho mỗi lượt giới thiệu thành công.

Kịch bản demo hiệu quả nhất: xin đơn hàng họ **đang làm dở**, nhập vào phần mềm,
đưa ra sơ đồ cắt, so số cây nhôm với số họ đã dự tính. Chênh lệch chính là bài
thuyết trình.

## 6.4 Hỗ trợ khách hàng

Đây là phần tốn công nhất và cũng là phần giữ chân khách.

- **Zalo là kênh hỗ trợ chính**, không phải email hay ticket. Chấp nhận điều này.
- Trả lời trong giờ hành chính, **cam kết dưới 2 giờ**.
- Có **video hướng dẫn 3–5 phút** cho từng việc, tiếng Việt, giọng miền Bắc hoặc
  Nam tuỳ tệp khách.
- **Hỗ trợ nhập liệu ban đầu miễn phí**: nhập hộ bảng giá và hằng số cho khách mới.
  Tốn 2–3 giờ nhưng đây là rào cản lớn nhất khiến khách bỏ ngay tuần đầu.

## 6.5 Rủi ro và cách phòng

| Rủi ro | Hậu quả | Cách phòng |
|---|---|---|
| **Công thức sai → khách cắt hỏng lô nhôm** | Đền tiền, mất uy tín cả vùng | Bắt xác nhận cắt thử 1 bộ trước khi vào sản xuất hàng loạt. Ghi rõ trong điều khoản. `audit_log` mọi thay đổi công thức. |
| Rò dữ liệu giữa các tenant | Mất toàn bộ khách | RLS + middleware + test rò rỉ định kỳ |
| Mất dữ liệu | Mất khách vĩnh viễn | Backup hằng ngày, thử phục hồi hằng tháng |
| Khách nhập liệu dở dang rồi bỏ | Tỉ lệ bỏ dùng cao ở tuần đầu | Nhập hộ miễn phí; có sẵn bộ danh mục Xingfa chuẩn |
| Đối thủ hạ giá | Khó cạnh tranh trực diện | Bám vào tối ưu cắt và đầu thừa — khó sao chép nhanh |
| Phụ thuộc một mình bạn | Ốm là dự án dừng | Viết tài liệu, test đầy đủ, tách `packages/core` sạch |

Rủi ro hàng đầu là hàng đầu tiên. Hãy xử lý nó bằng **quy trình**, không chỉ bằng
code: buộc khách xác nhận bộ cắt thử, lưu vết ai sửa công thức lúc nào, và ghi
điều khoản trách nhiệm rõ ràng trong hợp đồng thuê bao.

## 6.6 Chỉ số cần theo dõi

Ít thôi, nhưng theo dõi đều:

- **Số xưởng dùng thật** (có ≥ 5 báo giá/tuần) — không phải số đăng ký
- **Tỉ lệ giữ chân sau 3 tháng** — dưới 70% là có vấn đề về sản phẩm, không phải về bán hàng
- **Số báo giá lập mỗi tuần** — thước đo phần mềm có nằm trong quy trình của họ không
- **Thời gian từ đăng ký đến báo giá đầu tiên** — càng ngắn càng ít bỏ dùng; mục tiêu dưới 1 ngày

## 6.7 Pháp lý

- Đăng ký kinh doanh, xuất hoá đơn VAT — xưởng cần hoá đơn để hạch toán chi phí
- Hợp đồng thuê bao có **điều khoản giới hạn trách nhiệm** với thiệt hại do sai kích
  thước; đồng thời quy định khách phải cắt thử trước khi sản xuất hàng loạt
- Điều khoản bảo mật dữ liệu: bảng giá và danh sách khách hàng của xưởng là tài sản
  nhạy cảm — cam kết không dùng cho mục đích khác
- Nếu dùng mã profile và thông số từ catalogue nhà sản xuất (Xingfa, Việt Pháp…),
  kiểm tra điều kiện sử dụng; an toàn nhất là để khách tự nhập hoặc xin phép bằng văn bản
