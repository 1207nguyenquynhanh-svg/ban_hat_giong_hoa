const path = require("path");
const crypto = require("crypto");
const sqlite3 = require("sqlite3").verbose();

// Cơ sở dữ liệu được lưu thành file trong thư mục gốc dự án.
const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, "..", "floraseed.db");
const db = new sqlite3.Database(databasePath);

// Bọc callback SQLite bằng Promise để model có thể dùng async/await.
db.runAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function (error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

db.getAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
};

db.allAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
};

const sampleProducts = [
  {
    name: "Hướng dương rực nắng",
    description: "Những đóa hoa vàng nổi bật, điểm tô góc vườn ngập nắng.",
    price: 35000,
    image_url: "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=900&q=85",
    category: "Hoa kiểng cắt cành",
    germination_days: "7–14 ngày",
    difficulty: "Dễ"
  },
  {
    name: "Dạ yến thảo pastel",
    description: "Rực rỡ sắc màu, nở thành từng thảm hoa mềm mại.",
    price: 39000,
    image_url: "https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=900&q=85",
    category: "Hoa ban công",
    germination_days: "7–12 ngày",
    difficulty: "Dễ"
  },
  {
    name: "Cẩm tú cầu xanh",
    description: "Chùm hoa tròn đầy duyên dáng, hợp khí hậu mát mẻ.",
    price: 55000,
    image_url: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=900&q=85",
    category: "Hoa kiểng cắt cành",
    germination_days: "14–28 ngày",
    difficulty: "Trung bình"
  },
  {
    name: "Hồng ngoại Juliet",
    description: "Sắc hồng đào thanh lịch với dáng hoa cổ điển.",
    price: 68000,
    image_url: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=900&q=85",
    category: "Hoa hồng ngoại",
    germination_days: "14–21 ngày",
    difficulty: "Khó"
  },
  {
    name: "Oải hương thơm",
    description: "Sắc tím dịu mắt, hương thơm thư thái cho ban công.",
    price: 42000,
    image_url: "https://images.unsplash.com/photo-1499002238440-d264edd596ec?auto=format&fit=crop&w=900&q=85",
    category: "Hoa ban công",
    germination_days: "14–28 ngày",
    difficulty: "Trung bình"
  },
  {
    name: "Cúc họa mi trắng",
    description: "Hoa nhỏ xinh, dễ chăm và nở rộ trong nắng nhẹ.",
    price: 28000,
    image_url: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=900&q=85",
    category: "Hạt giống dễ trồng",
    germination_days: "5–10 ngày",
    difficulty: "Dễ"
  },
  {
    name: "Thạch thảo tím",
    description: "Từng cụm hoa li ti mang vẻ đẹp tự nhiên, bền bỉ.",
    price: 32000,
    image_url: "https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=900&q=85",
    category: "Hạt giống dễ trồng",
    germination_days: "7–14 ngày",
    difficulty: "Dễ"
  },
  {
    name: "Hồng leo cổ điển",
    description: "Giàn hoa lãng mạn, thích hợp cho sân vườn nhiều nắng.",
    price: 72000,
    image_url: "https://images.unsplash.com/photo-1455659817273-f96807779a8a?auto=format&fit=crop&w=900&q=85",
    category: "Hoa hồng ngoại",
    germination_days: "21–35 ngày",
    difficulty: "Khó"
  }
];

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

async function initializeDatabase() {
  await db.runAsync("PRAGMA foreign_keys = ON");
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price >= 0),
      image_url TEXT NOT NULL,
      category TEXT NOT NULL,
      germination_days TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('Dễ', 'Trung bình', 'Khó')),
      stock INTEGER NOT NULL DEFAULT 50 CHECK (stock >= 0)
    )
  `);
  await migrateUsersTable();
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      items_json TEXT NOT NULL DEFAULT '[]',
      total_price INTEGER NOT NULL DEFAULT 0 CHECK (total_price >= 0),
      status TEXT NOT NULL DEFAULT 'pending',
      total INTEGER NOT NULL CHECK (total >= 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      unit_price INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0)
    )
  `);
  await migrateOrdersTable();

  for (const product of sampleProducts) {
    await db.runAsync(
      `UPDATE products
       SET description = ?, price = ?, image_url = ?, category = ?, germination_days = ?, difficulty = ?
       WHERE name = ?`,
      [
        product.description,
        product.price,
        product.image_url,
        product.category,
        product.germination_days,
        product.difficulty,
        product.name
      ]
    );
    await db.runAsync(
      `INSERT INTO products
        (name, description, price, image_url, category, germination_days, difficulty)
       SELECT ?, ?, ?, ?, ?, ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = ?)`,
      [
        product.name,
        product.description,
        product.price,
        product.image_url,
        product.category,
        product.germination_days,
        product.difficulty,
        product.name
      ]
    );
  }

  async function migrateOrdersTable() {
    const columns = await db.allAsync("PRAGMA table_info(orders)");
    const existingNames = new Set(columns.map((column) => column.name));
    const additions = [
      ["order_code", "TEXT"],
      ["items_json", "TEXT NOT NULL DEFAULT '[]'"],
      ["total_price", "INTEGER NOT NULL DEFAULT 0"],
      ["status", "TEXT NOT NULL DEFAULT 'pending'"]
    ];

    for (const [name, definition] of additions) {
      if (!existingNames.has(name)) {
        await db.runAsync(`ALTER TABLE orders ADD COLUMN ${name} ${definition}`);
      }
    }

    const legacyOrders = await db.allAsync(`
      SELECT id, total, created_at
      FROM orders
      WHERE order_code IS NULL OR items_json = '[]' OR total_price = 0
    `);
    for (const order of legacyOrders) {
      const legacyItems = await db.allAsync(
        `SELECT product_id AS productId, product_name AS name, unit_price AS unitPrice, quantity
         FROM order_items WHERE order_id = ?`,
        [order.id]
      );
      const createdDate = String(order.created_at || "").replace(/\D/g, "").slice(0, 8);
      const orderCode = `FS-${createdDate || "LEGACY"}-${String(order.id).padStart(6, "0")}`;
      await db.runAsync(
        `UPDATE orders
         SET order_code = COALESCE(order_code, ?),
             items_json = CASE WHEN items_json = '[]' THEN ? ELSE items_json END,
             total_price = CASE WHEN total_price = 0 THEN total ELSE total_price END
         WHERE id = ?`,
        [orderCode, JSON.stringify(legacyItems), order.id]
      );
    }

    await db.runAsync(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code)"
    );
  }

  const admin = await db.getAsync("SELECT id FROM users WHERE username = ?", ["admin"]);
  if (!admin) {
    const salt = crypto.randomBytes(16).toString("hex");
    await db.runAsync(
      "INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, ?)",
      ["admin", hashPassword("Flora@Seed123", salt), salt, "admin"]
    );
  }
}

async function migrateUsersTable() {
  const existingTable = await db.getAsync(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'"
  );

  const existingColumns = existingTable
    ? await db.allAsync("PRAGMA table_info(users)")
    : [];
  const hasRoleColumn = existingColumns.some((column) => column.name === "role");
  const hasRoleConstraint = existingTable
    && /CHECK\s*\(\s*role\s+IN\s*\(\s*'admin'\s*,\s*'customer'\s*\)\s*\)/i.test(existingTable.sql);

  if (existingTable && (!hasRoleColumn || !hasRoleConstraint)) {
    const migratedRole = hasRoleColumn
      ? "CASE WHEN role = 'admin' THEN 'admin' ELSE 'customer' END"
      : "CASE WHEN username = 'admin' THEN 'admin' ELSE 'customer' END";
    await db.runAsync("BEGIN IMMEDIATE TRANSACTION");
    try {
      await db.runAsync("ALTER TABLE users RENAME TO users_legacy_migration");
      await createUsersTable();
      await db.runAsync(`
        INSERT INTO users (id, username, password_hash, salt, role)
        SELECT id, username, password_hash, salt, ${migratedRole}
        FROM users_legacy_migration
      `);
      await db.runAsync("DROP TABLE users_legacy_migration");
      await db.runAsync("COMMIT");
    } catch (error) {
      await db.runAsync("ROLLBACK");
      throw error;
    }
    return;
  }

  await createUsersTable();
}

function createUsersTable() {
  return db.runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer'
        CHECK (role IN ('admin', 'customer'))
    )
  `);
}

module.exports = { db, initializeDatabase };
