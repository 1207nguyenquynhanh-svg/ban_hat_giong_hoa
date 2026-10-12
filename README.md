# FloraSeed — Hạt giống hoa

Website bán hạt giống hoa FloraSeed dùng Node.js, Express, EJS và SQLite. Mã
nguồn được chia theo mô hình MVC: model truy cập dữ liệu, controller xử lý yêu
cầu, router định tuyến và view hiển thị giao diện. Giỏ hàng được lưu theo session
ở máy chủ, tách riêng theo tài khoản customer; Admin không sử dụng giỏ hàng.

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

Sau khi đăng nhập bằng tài khoản admin, mở `/admin/dashboard` để xem tổng
doanh thu, đơn hàng và thêm/cập nhật/xóa sản phẩm. Người chưa đăng nhập sẽ được
chuyển đến trang đăng nhập; tài khoản customer nhận lỗi 403.
Khách hàng đã đăng nhập xem lịch sử đơn hàng tại `/customer/orders`; truy vấn
chỉ trả về các đơn có `user_id` bằng ID tài khoản hiện tại. Khi đơn ở trạng
thái `pending`, khách có thể sửa người nhận, số điện thoại, địa chỉ, sản phẩm
và số lượng, hoặc hủy đơn. Các thao tác xác minh lại quyền sở hữu/trạng thái
và cập nhật tồn kho trong giao dịch SQLite.
Khách chưa đăng nhập vẫn có thể xem sản phẩm; thao tác thêm giỏ hàng và đặt
hàng yêu cầu đăng nhập bằng tài khoản customer. Tài khoản admin không có giỏ
hàng và không thể đặt hàng. Hiện tại đăng ký dùng tên đăng nhập/mật khẩu; chưa
có xác minh email/SMS.

## Cấu trúc MVC

```text
config/db.js                    Kết nối SQLite, khởi tạo bảng và dữ liệu mẫu
models/productModel.js          Tìm kiếm và đọc sản phẩm
models/userModel.js             Truy vấn và tạo tài khoản customer
models/orderModel.js            Lưu đơn hàng, mã đơn và kiểm tra tồn kho
controllers/                    Xử lý trang sản phẩm, đặt hàng và đăng nhập
controllers/adminController.js  Thống kê đơn và quản lý sản phẩm
controllers/cartController.js   Đọc và cập nhật giỏ hàng trong session
controllers/customerController.js Hiển thị lịch sử đơn của tài khoản customer
routes/productRoutes.js         Định tuyến cửa hàng và checkout
routes/authRoutes.js            Định tuyến đăng nhập và đăng xuất
routes/adminRoutes.js           Các route quản trị có middleware role admin
routes/cartRoutes.js            API giỏ hàng theo session
routes/customerRoutes.js        Trang lịch sử đơn hàng riêng theo user_id
middleware/requireCustomer.js   Bắt buộc đăng nhập customer để mua hàng
routes/productImageUpload.js    Kiểm tra và nhận ảnh PNG/JPG bằng Multer
views/                          Các trang EJS và partial dùng chung
views/admin/dashboard.ejs       Trang tổng quan và quản lý FloraSeed
public/css/style.css            Giao diện responsive
public/js/main.js               Đồng bộ giỏ session và gửi yêu cầu đặt hàng
public/uploads/                 Ảnh sản phẩm tải từ máy quản trị
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
Đơn mới gắn `user_id` tài khoản đặt, trong khi tên người nhận, số điện thoại
và địa chỉ có thể khác nhau ở từng đơn; đơn cũ được giữ `user_id` rỗng khi
migration.
Khi lưu đơn thành công, trình duyệt hiển thị mã xác nhận và session cart được
xóa; nếu lưu thất bại, giỏ hàng được giữ nguyên. API trả mã và tổng tiền ở cả
dạng camelCase lẫn snake_case. Thanh toán chỉ là mô phỏng, không tích hợp cổng
thanh toán. Admin có thể tải lên ảnh PNG/JPG tối đa 5 MB hoặc nhập URL HTTPS;
ảnh tải lên được kiểm tra chữ ký file trước khi lưu vào `public/uploads/`.
