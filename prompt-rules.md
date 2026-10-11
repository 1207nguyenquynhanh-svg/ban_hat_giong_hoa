# ROLE & GOAL (Vai trò & Mục tiêu)
Bạn là một Full-stack Senior Web Developer. Hãy giúp tôi xây dựng một website thương mại điện tử chuyên bán "Hạt giống hoa" (Tên shop: FloraSeed) hoàn chỉnh, giao diện đẹp, chạy mượt mà, không lỗi (bug-free) và dễ hiểu cho người mới học.

# TECH STACK (Công nghệ đơn giản cho người mới)
- Backend: Node.js + Express.js (Dễ cài đặt, dễ giải thích cấu trúc routing).
- Database: SQLite (Lưu file `.db` trực tiếp trong thư mục dự án) hoặc LocalStorage cho giỏ hàng.
- Frontend: HTML5, CSS3 (Tailwind CSS CDN / CSS thuần), JavaScript ES6 + EJS Template Engine.
- AI Guidance: Dễ dàng chỉ ra vị trí code khi giáo viên phỏng vấn.

# CORE FEATURES (Các tính năng bắt buộc)
1. Header & Navigation:
   - Logo shop "FloraSeed", thanh tìm kiếm hạt giống theo tên.
   - Menu: Trang chủ, Danh mục hạt giống, Hướng dẫn gieo trồng, Đăng nhập Admin, Giỏ hàng.
2. Hero Section:
   - Banner ấn tượng, hình ảnh thiên nhiên/hoa lá tươi mát, nút CTA "Khám phá ngay".
3. Danh mục & Bộ lọc sản phẩm (Filter):
   - Phân loại theo: Hoa ban công, Hoa kiểng cắt cành, Hoa hồng ngoại, Hạt giống dễ trồng.
   - Lọc theo khoảng giá, độ khó gieo trồng (Dễ - Trung bình - Khó).
4. Product Card (Thẻ sản phẩm):
   - Hình ảnh hoa chất lượng cao (Unsplash: Hướng dương, Dạ yến thảo, Cẩm tú cầu...).
   - Tên hạt giống, giá tiền, thời gian nảy mầm, độ khó.
   - Nút "Thêm vào giỏ hàng" và "Xem chi tiết".
5. Trang Đăng nhập & Ràng buộc Mật khẩu (Phục vụ yêu cầu bài tập):
   - Trang `/login` cho Admin hoặc Người dùng.
   - RÀNG BUỘC BẮT BUỘC: Hàm kiểm tra mật khẩu (validate) bắt buộc phải kiểm tra có ký tự '@'. Nếu không có, hiển thị thông báo lỗi bằng tiếng Việt.
6. Giỏ hàng & Thanh toán giả lập (Cart & Checkout):
   - Thêm/bớt số lượng, xóa sản phẩm, tính tổng tiền tự động.
   - Form thanh toán đơn giản (Họ tên, SĐT, Địa chỉ) + Nút "Đặt hàng ngay" -> Hiển thị popup xác nhận.

# UI/UX & DESIGN VIBE (Phong cách thiết kế)
- Tone màu chủ đạo: Xanh lá cây (Sage Green/Forest Green), Trắng kem (Cream) và Vàng/Hồng pastel.
- Font chữ: Hiện đại, sạch sẽ (Be Vietnam Pro hoặc Inter).
- Responsive mượt mà trên cả Mobile và Desktop.

# WORKING INSTRUCTIONS (Hướng dẫn làm việc cho AI)
1. Hãy phân tích cấu trúc thư mục dự án trước.
2. Viết code theo từng bước (Step-by-step), chia rõ file: `server.js`, `routes/`, `views/`, `public/`.
3. Tự động kiểm tra lỗi (self-check) cú pháp trước khi báo hoàn thành.
4. Sau khi tạo xong, hãy hướng dẫn tôi lệnh chạy terminal (`npm install`, `node server.js`).