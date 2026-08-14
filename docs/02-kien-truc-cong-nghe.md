# 2. Kiến trúc & công nghệ

## 2.1 Chọn stack

Khuyến nghị cho đội 1–3 người, ngân sách hạn chế, cần ra sản phẩm nhanh:

| Thành phần | Chọn | Lý do |
|---|---|---|
| Ngôn ngữ | **TypeScript** | Một ngôn ngữ cho cả web, server, mobile. Kiểu dữ liệu chặt — quan trọng khi tính toán mm và tiền |
| Backend | **NestJS** (hoặc Next.js API routes nếu muốn gọn hơn) | Cấu trúc module rõ, hợp với domain nhiều module |
| CSDL | **PostgreSQL** | Miễn phí, mạnh, có JSONB để lưu công thức linh hoạt |
| ORM | **Prisma** | Migration dễ, sinh type tự động |
| Web | **Next.js + React** | SEO cho trang bán hàng + app trong cùng dự án |
| Vẽ cửa | **SVG thuần** (không thư viện) | Vẽ ra rồi đổi sang PNG bằng `resvg` để gửi Zalo |
| Excel | `exceljs` | Xuất báo giá, phiếu cắt |
| PDF | `puppeteer` render từ HTML | Tận dụng lại giao diện, không phải làm layout 2 lần |
| Mobile | **PWA trước, React Native sau** | Tiết kiệm 3–4 tháng ở giai đoạn đầu |
| Hosting | VPS Việt Nam (Viettel/VNPT/Vietnix) hoặc Singapore | Khách VN, cần độ trễ thấp và xuất hoá đơn VNĐ |

### Không nên chọn

- **Desktop app (WinForms/WPF)** — ACT đời cũ đi hướng này. Cài đặt, cập nhật, hỗ trợ từ xa
  rất tốn công. Web giải quyết hết. Chỉ làm desktop nếu khách yêu cầu chạy offline hoàn toàn.
- **Microservices** — quá sớm. Một monolith có module rõ ràng là đủ cho vài nghìn người dùng.
- **MongoDB** — dữ liệu ở đây quan hệ rất chặt (báo giá → bộ cửa → thanh → profile → giá).
  Dùng SQL.

## 2.2 Cấu trúc thư mục

```
may-phay-do/
├── apps/
│   ├── web/                  # Next.js — giao diện người dùng
│   └── api/                  # NestJS — API
├── packages/
│   ├── core/                 # ⭐ LÕI: không phụ thuộc framework
│   │   ├── formula/          #   engine biểu thức công thức
│   │   ├── explode/          #   bóc tách bộ cửa → danh sách thanh
│   │   ├── optimize/         #   tối ưu cắt 1D
│   │   ├── pricing/          #   tính giá
│   │   └── drawing/          #   sinh SVG bản vẽ
│   ├── db/                   # Prisma schema + migration + seed
│   └── shared/               # type dùng chung, tiện ích đơn vị đo
├── docs/
└── prototype/                # bản demo chạy nhanh (xem README)
```

**Quy tắc vàng:** `packages/core` **không được import** bất kỳ thứ gì của
NestJS, Next.js, Prisma hay HTTP. Đầu vào là object thuần, đầu ra là object thuần.
Nhờ vậy:
- Viết test cực nhanh, không cần dựng DB
- Sau này muốn làm app desktop hay CLI cho máy CNC thì dùng lại nguyên vẹn
- Thuê người khác kiểm chứng công thức mà không cần họ hiểu cả hệ thống

## 2.3 Đơn vị đo — quy ước bắt buộc

Đây là nguồn gốc của hầu hết bug trong loại phần mềm này.

| Đại lượng | Đơn vị lưu trong hệ thống | Kiểu dữ liệu |
|---|---|---|
| Chiều dài | **milimét (mm)**, số nguyên | `Int` |
| Diện tích | mm², tính ra m² chỉ khi hiển thị | `Int` |
| Khối lượng | **gam**, số nguyên | `Int` |
| Tiền | **đồng**, số nguyên | `BigInt` hoặc `Decimal(18,0)` |
| Khối lượng riêng profile | gam/mét, số nguyên | `Int` |

**Tuyệt đối không dùng `Float`/`Number` cho tiền.** `0.1 + 0.2 !== 0.3`; nhân với
vài triệu đồng thì sai số thành tiền thật. Nếu buộc phải dùng JavaScript number cho
chiều dài thì phải làm tròn ngay sau mỗi phép tính.

Chỉ đổi đơn vị ở **tầng hiển thị**:

```ts
export const mmToM  = (mm: number) => mm / 1000;
export const mm2ToM2 = (mm2: number) => mm2 / 1_000_000;
export const formatVND = (d: bigint) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(d));
```

## 2.4 Đa công ty (multi-tenant)

Bán theo thuê bao thì mỗi xưởng là một *tenant*, và họ **phải sửa được công thức,
bảng giá của riêng mình** mà không ảnh hưởng ai.

Cách làm đơn giản và an toàn nhất cho giai đoạn đầu: **shared database, cột `tenant_id`**.

- Mọi bảng nghiệp vụ có cột `tenant_id NOT NULL`
- Bật **Row Level Security** của PostgreSQL, hoặc dùng Prisma middleware tự chèn
  điều kiện `tenant_id` vào mọi truy vấn
- Dữ liệu danh mục gốc (hệ nhôm, profile chuẩn của Xingfa) để `tenant_id = NULL`
  nghĩa là dùng chung; khi tenant sửa thì tạo bản sao riêng của họ (copy-on-write)

> Bỏ sót một câu truy vấn không lọc `tenant_id` = lộ bảng giá của xưởng này cho xưởng
> khác. Với ngành này đó là lỗi chết người. Hãy dùng middleware ép ở tầng thấp nhất,
> đừng tin vào việc nhớ viết `where` ở từng chỗ.

## 2.5 Môi trường & khởi tạo dự án

```bash
# 1. Khởi tạo
mkdir may-phay-do && cd may-phay-do
npm init -y
npm pkg set workspaces='["apps/*","packages/*"]' --json

# 2. CSDL bằng Docker
cat > docker-compose.yml <<'EOF'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: cua
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes: { pgdata: {} }
EOF
docker compose up -d

# 3. Prisma
mkdir -p packages/db && cd packages/db
npm init -y && npm i -D prisma && npm i @prisma/client
npx prisma init --datasource-provider postgresql
```

Biến môi trường `.env` (không commit lên git):

```
DATABASE_URL="postgresql://postgres:dev@localhost:5432/cua"
JWT_SECRET="đổi-thành-chuỗi-ngẫu-nhiên-dài"
```

## 2.6 Sao lưu — làm ngay từ ngày đầu

Khách hàng nhập bảng giá và công thức mất hàng chục giờ. Mất dữ liệu là mất khách vĩnh viễn.

```bash
# cron hằng ngày 2h sáng
0 2 * * * pg_dump -Fc cua > /backup/cua-$(date +\%F).dump
# giữ 30 ngày, đồng bộ lên object storage
```

Mỗi tháng **phục hồi thử một lần** vào máy khác. Bản backup chưa từng restore thành công
thì coi như không có.
