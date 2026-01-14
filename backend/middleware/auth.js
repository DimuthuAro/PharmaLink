const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");

    // set both styles to avoid bugs
    req.user = payload;          // { userId, email }
    req.userId = payload.userId; // convenience

    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
