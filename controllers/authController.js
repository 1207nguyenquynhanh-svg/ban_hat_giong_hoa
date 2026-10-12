const crypto = require("crypto");
const userModel = require("../models/userModel");

function validatePassword(password) {
  return typeof password === "string" && password.length <= 256 && password.includes("@");
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function showLogin(req, res) {
  res.render("login", {
    pageTitle: "Đăng nhập FloraSeed",
    error: null,
    username: "",
    mode: "login"
  });
}

function showRegister(req, res) {
  res.render("login", {
    pageTitle: "Tạo tài khoản FloraSeed",
    error: null,
    username: "",
    mode: "register"
  });
}

async function login(req, res, next) {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!username || username.length > 80) {
    res.status(400).render("login", {
      pageTitle: "Đăng nhập FloraSeed",
      error: "Vui lòng nhập tên đăng nhập hợp lệ.",
      username: username.slice(0, 80),
      mode: "login"
    });
    return;
  }

  if (!validatePassword(password)) {
    res.status(400).render("login", {
      pageTitle: "Đăng nhập FloraSeed",
      error: "Mật khẩu phải chứa ký tự @ và không dài quá 256 ký tự.",
      username,
      mode: "login"
    });
    return;
  }

  try {
    const user = await userModel.findByUsername(username);
    if (user) {
      const candidate = Buffer.from(hashPassword(password, user.salt), "hex");
      const expected = Buffer.from(user.password_hash, "hex");
      if (candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected)) {
        req.session.regenerate((sessionError) => {
          if (sessionError) {
            next(sessionError);
            return;
          }
          req.session.user = { id: user.id, username: user.username, role: user.role };
          res.redirect("/");
        });
        return;
      }
    }
    res.status(401).render("login", {
      pageTitle: "Đăng nhập FloraSeed",
      error: "Tên đăng nhập hoặc mật khẩu không chính xác.",
      username,
      mode: "login"
    });
  } catch (error) {
    next(error);
  }
}

async function register(req, res, next) {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!username || username.length > 80) {
    res.status(400).render("login", {
      pageTitle: "Tạo tài khoản FloraSeed",
      error: "Tên đăng nhập phải có từ 1 đến 80 ký tự.",
      username: username.slice(0, 80),
      mode: "register"
    });
    return;
  }

  if (!validatePassword(password)) {
    res.status(400).render("login", {
      pageTitle: "Tạo tài khoản FloraSeed",
      error: "Mật khẩu phải chứa ký tự @ và không dài quá 256 ký tự.",
      username,
      mode: "register"
    });
    return;
  }

  try {
    const existingUser = await userModel.findByUsername(username);
    if (existingUser) {
      res.status(409).render("login", {
        pageTitle: "Tạo tài khoản FloraSeed",
        error: "Tên đăng nhập này đã được sử dụng.",
        username,
        mode: "register"
      });
      return;
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    const result = await userModel.createCustomer({ username, passwordHash, salt });

    req.session.regenerate((sessionError) => {
      if (sessionError) {
        next(sessionError);
        return;
      }
      req.session.user = {
        id: result.lastID,
        username,
        role: "customer"
      };
      res.redirect("/");
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT") {
      res.status(409).render("login", {
        pageTitle: "Tạo tài khoản FloraSeed",
        error: "Tên đăng nhập này đã được sử dụng.",
        username,
        mode: "register"
      });
      return;
    }
    next(error);
  }
}

function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) {
      next(error);
      return;
    }
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
}

module.exports = { validatePassword, showLogin, login, showRegister, register, logout };
