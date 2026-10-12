# BÁO CÁO ĐỒ ÁN VIBE CODING: WEBSITE BÁN HẠT GIỐNG HOA FLORASEED

**Tên sinh viên / Nhóm thực hiện:** Nguyễn Thị Quỳnh Anh/ Nhóm 4
**Môn học / Đồ án:** Đồ án xây dựng và phat triển phần mềm
**Chủ đề:** Ứng dụng AI Hỗ Trợ Lập Trình (Vibe Coding) & Kiểm Soát Mã Nguồn

---

## 1. TỔNG QUAN & Ý HIỂU KIẾN TRÚC MVC

Dự án **FloraSeed** được xây dựng nhằm cung cấp nền tảng thương mại điện tử chuyên biệt cho các sản phẩm hạt giống hoa. Để đảm bảo tính rõ ràng, dễ bảo trì và dễ giải trình khi kiểm tra mã nguồn, hệ thống được thiết kế theo **Mô hình MVC (Model - View - Controller)** kết hợp trợ lý AI (VS Code Chat / Copilot):

 **Model (`models/`):** Chịu trách nhiệm tương tác trực tiếp với cơ sở dữ liệu SQLite (`floraseed.db`). Các file model thực hiện các câu lệnh SQL truy vấn sản phẩm, quản lý người dùng và lưu trữ đơn hàng.
 **View (`views/`):** Tầng giao diện người dùng sử dụng **EJS (Embedded JavaScript Templates)** kết hợp CSS (Tailwind/Custom CSS). Tầng này hiển thị dữ liệu được truyền từ Controller ra màn hình trình duyệt (Trang chủ, Chi tiết sản phẩm, Giỏ hàng, Đăng nhập).
 **Controller (`controllers/`):** Trái tim xử lý logic nghiệp vụ (Business Logic). Controller nhận request từ Router, gọi Model để lấy/lưu dữ liệu, xử lý thuật toán (như validate dữ liệu) và trả về View tương ứng.
 **Routes (`routes/`):** Định nghĩa các đường dẫn URL (Endpoints) và phân phối request đến đúng phương thức xử lý trong Controller.
 **Config (`config/`):** Chứa cấu hình kết nối CSDL chung cho toàn bộ ứng dụng.

---

## 2. GIẢI THÍCH VỊ TRÍ CODE ĐĂNG NHẬP VÀ RÀNG BUỘC MẬT KHẨU CÓ CHỨA KÝ TỰ `@`

Theo yêu cầu kiểm tra kỹ năng kiểm soát mã nguồn, hệ thống phân định rõ ràng vị trí logic xác thực như sau:

### Vị trí mã nguồn đăng nhập:
 **Đường dẫn file Controller:** `controllers/authController.js`
 **Đường dẫn file Route:** `routes/authRoutes.js` (xử lý phương thức `POST /login`)
 **Đường dẫn file Giao diện:** `views/login.ejs` (Form nhập liệu Username và Password)

### Logic Ràng buộc Mật khẩu (Validate `@` Constraint):
Ngay tại hàm xử lý đăng nhập trong Controller, hệ thống thực hiện kiểm tra chuỗi ký tự của mật khẩu trước khi cho phép truy cập cơ sở dữ liệu. Đoạn mã minh họa ý hiểu:

```javascript
// Trích đoạn logic xử lý đăng nhập trong authController.js
exports.postLogin = (req, res) => {
    const { username, password } = req.body;

    // RÀNG BUỘC KỸ THUẬT: Mật khẩu bắt buộc phải chứa ký tự '@'
    if (!password || !password.includes('@')) {
        return res.render('login', { 
            error: 'Mật khẩu không hợp lệ! Mật khẩu bắt buộc phải chứa ký tự "@".' 
        });
    }

    // Tiến hành kiểm tra tài khoản trong database nếu thỏa mãn ràng buộc
    // ...
};

### Lỗi khuyết thiếu hệ thống:
Ban đầu, khi AI sinh ra phiên bản V1, hệ thống chỉ dừng lại ở mức giao diện mô phỏng (Mock UI). Qua kiểm thử và phân tích nghiệp vụ thực tế, nhóm/cá nhân đã phát hiện các điểm hạn chế về phân quyền Admin/Khách hàng, tính năng lưu trữ đơn hàng và lỗ hổng bảo mật. Từ đó đã tiến hành Refactor (nâng cấp) mã nguồn V2 với mô hình MVC chuẩn chỉnh...
