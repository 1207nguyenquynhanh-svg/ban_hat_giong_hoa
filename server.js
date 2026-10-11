const path = require("path");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const { db, initializeDatabase } = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 4
  }
}));
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

app.use("/", productRoutes);
app.use("/", authRoutes);

app.use((req, res) => {
  res.status(404).render("404", { pageTitle: "Không tìm thấy trang" });
});

app.use((error, req, res, next) => {
  console.error("Lỗi xử lý yêu cầu:", error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
    ? error.status
    : 500;
  if (req.path === "/checkout" && req.accepts("json")) {
    res.status(status).json({ error: "Đơn hàng chưa được xử lý. Vui lòng thử lại." });
    return;
  }
  res.status(status).render("error", { pageTitle: "Đã xảy ra lỗi" });
});

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`FloraSeed đang chạy tại http://localhost:${PORT}`);
      console.log("Tài khoản admin demo: admin / Flora@Seed123");
      if (!process.env.SESSION_SECRET) {
        console.warn("Đang dùng khóa phiên tạm thời. Hãy đặt SESSION_SECRET khi triển khai.");
      }
    });
  } catch (error) {
    console.error("Không thể khởi tạo cơ sở dữ liệu FloraSeed:", error);
    db.close();
    process.exitCode = 1;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
