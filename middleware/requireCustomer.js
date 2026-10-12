const loginMessage = "Vui lòng đăng nhập tài khoản để tiến hành đặt hàng.";

function safeReturnTo(value) {
  return typeof value === "string"
    && value.startsWith("/")
    && !value.startsWith("//")
    && !value.startsWith("/\\")
    && !/[\r\n]/.test(value)
    ? value
    : "/";
}

function requireCustomer(req, res, next) {
  if (req.session.user?.role === "customer") {
    next();
    return;
  }

  if (req.session.user?.role === "admin") {
    res.status(403).json({ error: "Tài khoản quản trị không thể đặt hàng." });
    return;
  }

  const returnTo = safeReturnTo(req.query.returnTo || req.get("referer")?.replace(
    `${req.protocol}://${req.get("host")}`,
    ""
  ));
  const loginUrl = `/login?message=${encodeURIComponent(loginMessage)}&returnTo=${encodeURIComponent(returnTo)}`;
  if (req.accepts("html")) {
    res.redirect(loginUrl);
    return;
  }

  res.status(401).json({ error: loginMessage, loginUrl });
}

module.exports = requireCustomer;
