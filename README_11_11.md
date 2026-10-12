# BÁO CÁO TỔNG KẾT VIBE CODING & KIỂM SOÁT MÃ NGUỒN (PHẦN 2)
## DỰ ÁN: WEBSITE BÁN HẠT GIỐNG HOA FLORASEED

**Tên học viên / Nhóm thực hiện:** Nguyễn Thị Quỳnh Anh  
**Phương pháp thực hiện:** Vibe Coding (VS Code Chat / GitHub Copilot Agent) kết hợp Kiểm soát mã nguồn nâng cao.

---

## 1. HÀNH TRÌNH NÂNG CẤP DỰ ÁN (TỪ PROTOTYPE ĐẾN HỆ THỐNG THỰC TẾ)

Trong báo cáo `README_4_11.md`, hệ thống FloraSeed đã xác lập được cấu trúc khung MVC cơ bản. Tại giai đoạn 2 này, dự án tập trung vào việc **phát hiện lỗ hổng nghiệp vụ thực tế và nâng cấp toàn diện phần mềm**:

1. **Phân quyền người dùng & Bảo mật Session (Authentication & RBAC):**
   * *Vấn đề phát hiện ở bản cũ:* Lộ tài khoản Admin trên Client F12, ai cũng có thể bấm đặt hàng mà không cần đăng nhập.
   * *Giải pháp nâng cấp:* Thiết lập `express-session` lưu phiên làm việc tại Server. Phân định rõ 2 vai trò `admin` và `customer`. Bắt buộc đăng nhập trước khi mua hàng.
   * *Duy trì ràng buộc cốt lõi:* Hàm validate mật khẩu tại `controllers/authController.js` bắt buộc kiểm tra ký tự `@`.

2. **Quản trị Admin Dashboard (`/admin/dashboard`):**
   * Tích hợp trang quản trị riêng cho Admin để theo dõi tổng doanh thu, số lượng đơn hàng.
   * Quản lý kho sản phẩm: Cho phép Thêm, Sửa giá/số lượng và Xóa sản phẩm.
   * Tích hợp middleware `multer` cho phép **upload ảnh hạt giống hoa trực tiếp từ máy tính (`.png`, `.jpg`)** thay vì chỉ nhận URL online.

3. **Luồng Khách hàng & Lịch sử Đơn hàng (`/customer/orders`):**
   * Phân tách giỏ hàng riêng biệt theo từng tài khoản (`user_id`).
   * Cho phép một tài khoản đăng nhập có thể linh hoạt đặt giao hàng đến nhiều số điện thoại và địa chỉ khác nhau.
   * Tích hợp trang "Đơn hàng của tôi" giúp khách hàng theo dõi mã đơn, thời gian đặt, chi tiết hạt giống và trạng thái xử lý.

---

## 2. KỸ NĂNG VIBE CODING VÀ QUẢN LÝ QUY TẮC PROMPT (PROMPT RULES)

Quá trình Vibe Coding thành công không đến từ việc copy code thụ động, mà dựa trên tư duy điều khiển AI có hệ thống:
* **Sử dụng file định hướng `prompt-rules.md`:** Đóng vai trò là bộ khung quy tắc (System Context) giúp AI hiểu rõ vai trò Senior Developer, chuẩn Tech Stack (Node.js/Express/EJS/SQLite) và không sinh code thừa.
* **Chiến lược Prompting chia nhỏ (One Prompt = One Task):** 
  * Thay vì ra lệnh tạo toàn bộ ứng dụng cùng lúc, tiến trình nâng cấp được chia làm 3 bước: *Phân quyền Auth Session* $\rightarrow$ *Lưu CSDL & Luồng Đặt hàng* $\rightarrow$ *Giao diện Admin & Upload ảnh*.
* **Kiểm tra và Phản biện chất lượng Code (Self-Correction):** Trực tiếp kiểm thử (Test Run) sau từng lần AI sinh code để phát hiện các lỗi phát sinh như `NaN`, `undefined` hay lỗi giỏ hàng dùng chung, từ đó đưa ra Prompt hiệu chỉnh (Refactoring) kịp thời.

---

## 3. PHÂN TÍCH LỊCH SỬ COMMIT & KIỂM SOÁT XUNG ĐỘT (GIT LOG & DIFF)

Việc quản lý dự án được thể hiện minh bạch qua lịch sử Commit trên GitHub (sử dụng phương thức xác thực bảo mật SSH):

### 📜 Lịch sử các bước Commit chính (Git Log):
1. `docs: them file bao cao README_4_11 ve kien truc mvc va quy trinh git` - Lưu vết báo cáo giai đoạn 1.
2. `feat: nang cap auth controller, phan quyen admin va quan ly session` - Nâng cấp phân quyền và bảo mật Server Session.
3. `feat: tich hop luu don hang vao CSDL sqlite va tra ve ma don hang` - Chuẩn hóa luồng lưu CSDL và mã hóa đơn.
4. `feat: hoan thien trang admin dashboard quan ly san pham va don hang` - Xây dựng giao diện quản trị viên.
5. `fix: sua loi hoa don undefined, phan tach gio hang va hoan thien quan ly kho admin` - Sửa lỗi giao diện và tính năng upload ảnh.
6. `feat: tich hop luong dang nhap truoc khi dat hang, xem don hang ca nhan va phan quyen admin` - Hoàn thiện toàn bộ luồng Khách hàng/Admin.

### 🔍 Kỹ năng soi mã nguồn qua Git Diff:
* Mọi sự thay đổi của AI đều được kiểm soát qua tab **Source Control (Ctrl + Shift + G)** trong VS Code.
* Bằng việc so sánh Git Diff (Code cũ màu đỏ / Code mới màu xanh), người phát triển luôn làm chủ từng dòng code được thêm vào Controller hay View trước khi thực hiện `git commit` và `git push`.

---
