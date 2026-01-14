const multer = require("multer");

// memory storage so we can send buffer to ML API + store in Mongo if needed
const storage = multer.memoryStorage();

module.exports = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB
});
