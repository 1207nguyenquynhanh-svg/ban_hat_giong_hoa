# FloraSeed — Hạt giống hoa

Website bán hạt giống hoa FloraSeed dùng Node.js, Express, EJS và SQLite. Mã
nguồn được chia theo mô hình MVC: model truy cập dữ liệu, controller xử lý yêu
cầu, router định tuyến và view hiển thị giao diện. Giỏ hàng lưu trong
LocalStorage của trình duyệt.

## Chạy ứng dụng

```sh
npm install
npm start
```

Mở <http://localhost:3000>. Có thể dùng `npm run dev` trên Node.js 18+ để tự
khởi động lại máy chủ khi sửa mã nguồn. Đặt biến môi trường `PORT` để đổi cổng.

Tài khoản admin demo: `admin` / `Flora@Seed123`. Đăng ký khách hàng tại
`/register`; biểu mẫu đăng ký không cho chọn role. Bảng `users` chỉ nhận role
`admin` hoặc `customer`. Mọi mật khẩu đăng nhập/đăng ký bắt buộc có ký tự `@`;
quy tắc được kiểm tra trong controller ở máy chủ. Session dùng
`express-session`, chỉ lưu ID phiên trong cookie `HttpOnly` còn thông tin người
dùng lưu phía máy chủ. Khi triển khai, hãy đặt `SESSION_SECRET` thành một chuỗi
bí mật riêng.
Có thể đặt `DATABASE_PATH` để chọn file SQLite khác.

## Cấu trúc MVC

```text
config/db.js                    Kết nối SQLite, khởi tạo bảng và dữ liệu mẫu
models/productModel.js          Tìm kiếm và đọc sản phẩm
models/userModel.js             Truy vấn và tạo tài khoản customer
models/orderModel.js            Lưu đơn hàng, mã đơn và kiểm tra tồn kho
controllers/                    Xử lý trang sản phẩm, đặt hàng và đăng nhập
routes/productRoutes.js         Định tuyến cửa hàng và checkout
routes/authRoutes.js            Định tuyến đăng nhập và đăng xuất
views/                          Các trang EJS và partial dùng chung
public/css/style.css            Giao diện responsive
public/js/main.js               Giỏ hàng và gửi yêu cầu đặt hàng
server.js                       Cấu hình Express và khởi chạy ứng dụng
```

Hàm `validatePassword` trong `controllers/authController.js` đảm bảo mật khẩu
đăng nhập và đăng ký chứa ký tự `@`; controller gọi hàm này ở phía máy chủ.
Role trong bảng `users` chỉ nhận `admin` hoặc `customer`. Tài khoản cũ có role
`user` được chuyển thành `customer` khi khởi tạo database; role đăng ký luôn do
model đặt là `customer`, không nhận role từ biểu mẫu.

Danh sách sản phẩm mẫu được thêm tự động khi khởi động. Bộ lọc và tìm kiếm đọc
dữ liệu SQLite; máy chủ xác minh giá và tồn kho khi tạo đơn. Mỗi đơn lưu mã
`order_code`, thông tin nhận hàng, `items_json`, `total_price` và trạng thái.
Khi lưu đơn thành công, trình duyệt hiển thị mã xác nhận và xóa giỏ hàng
LocalStorage; nếu lưu thất bại, giỏ hàng được giữ nguyên. Thanh toán chỉ là mô
phỏng, không tích hợp cổng thanh toán.
