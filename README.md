# Xây dựng phần mềm sản xuất cửa nhôm / nhựa lõi thép

Bộ tài liệu hướng dẫn **từng bước** để tự xây dựng một phần mềm tương đương
[ACT — phanmemcua.com](https://phanmemcua.com): thiết kế bộ cửa, bóc tách thanh nhôm,
tính kính + phụ kiện, tối ưu cắt phôi, xuất báo giá và bản vẽ sản xuất.

## Đọc theo thứ tự

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 1 | [Phân tích nghiệp vụ](docs/01-phan-tich-nghiep-vu.md) | Hiểu bài toán: hệ nhôm, bóc tách, trừ hao, phụ kiện. **Đọc kỹ nhất.** |
| 2 | [Kiến trúc & công nghệ](docs/02-kien-truc-cong-nghe.md) | Chọn stack, cấu trúc dự án, môi trường |
| 3 | [Mô hình dữ liệu](docs/03-mo-hinh-du-lieu.md) | Toàn bộ bảng + SQL khởi tạo |
| 4 | [Thuật toán lõi](docs/04-thuat-toan-loi.md) | Engine công thức bóc tách + tối ưu cắt 1D |
| 5 | [Lộ trình từng bước](docs/05-lo-trinh-tung-buoc.md) | **Kế hoạch làm việc theo tuần, có checklist** |
| 6 | [Kinh doanh & vận hành](docs/06-kinh-doanh-van-hanh.md) | Thuê bao, giá, cạnh tranh, hỗ trợ khách |

## Prototype chạy thử ngay

Không cần cài gì thêm (chỉ cần Node.js ≥ 18):

```bash
node prototype/demo.js
```

Sẽ in ra: bảng bóc tách một bộ cửa mở quay 2 cánh, danh sách kính, phụ kiện,
sơ đồ tối ưu cắt trên cây nhôm 5.85m và tỉ lệ hao hụt.

```bash
node prototype/test.js     # bộ test kiểm chứng thuật toán
```

## Tóm tắt 6 bước lớn

1. **Khảo sát** — ngồi với 2–3 xưởng, xin file Excel báo giá + công thức trừ hao thật.
2. **MVP bóc tách** — nhập rộng × cao → ra bảng cắt + báo giá Excel. Chưa cần web đẹp.
3. **Tối ưu cắt + bản vẽ** — phiếu cắt theo cây nhôm, ảnh PNG gửi Zalo.
4. **Quản lý** — khách hàng, công trình, đơn hàng, phân quyền, nhiều công ty (SaaS).
5. **Mobile + thuê bao** — PWA/app, thanh toán, gia hạn.
6. **Kho, công nợ, xuất file máy CNC** (máy cắt 2 đầu, máy phay đố, máy khoan).

Chi tiết mốc thời gian và checklist: [docs/05-lo-trinh-tung-buoc.md](docs/05-lo-trinh-tung-buoc.md).
