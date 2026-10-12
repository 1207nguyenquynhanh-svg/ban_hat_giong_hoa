const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDirectory = path.join(__dirname, "..", "public", "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedTypes = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"]
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename(req, file, callback) {
      callback(null, `${crypto.randomUUID()}${allowedTypes.get(file.mimetype) || ""}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    const expectedExtension = allowedTypes.get(file.mimetype);
    if (!expectedExtension || (extension !== expectedExtension && !(extension === ".jpeg" && expectedExtension === ".jpg"))) {
      callback(new Error("Chỉ chấp nhận ảnh PNG hoặc JPG."));
      return;
    }
    callback(null, true);
  }
}).single("image_file");

function uploadProductImage(req, res, next) {
  upload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    req.productUploadError = error;
    next();
  });
}

module.exports = { uploadProductImage };
