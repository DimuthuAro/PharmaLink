const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

// Load .env (Windows-safe)
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Local infra
const connectDB = require("./config/database");

// Logger (fallback to console if your logger file is missing)
let logger;
try {
  logger = require("./shared_infrastructure/logger");
} catch (e) {
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    stream: { write: (msg) => console.log(msg.trim()) }
  };
}

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   SECURITY & CORE MIDDLEWARE
========================= */

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
  })
);

// Compression
app.use(compression());

// Logging
app.use(morgan("combined", { stream: logger.stream }));

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false
  })
);

/* =========================
   BODY PARSING
========================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* =========================
   DATABASE
========================= */
connectDB();

/* =========================
   ROUTES
========================= */
const userRoutes = require("./routes/user");
//const interactionRoutes = require("./routes/interactions");

app.use("/api/users", userRoutes);
//app.use("/api/interactions", interactionRoutes);

/* =========================
   HEALTH
========================= */
app.get("/health", async (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

/* =========================
   MICROSERVICE PROXIES
========================= */

// helper to build a safe proxy (with good error message)
function proxyTo(target, basePath) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^${basePath}`]: "" },
    proxyTimeout: 60_000,
    timeout: 60_000,
    onError(err, req, res) {
      logger.error(`[proxy error] ${basePath} -> ${target}`, err.message);
      if (!res.headersSent) {
        res.status(502).json({
          error: "Microservice unavailable",
          service: basePath,
          target,
          details: err.message
        });
      }
    }
  });
}

// drug interaction microservice
app.use(
  "/api/drug-interactions",
  proxyTo(
    `http://localhost:${process.env.DRUG_INTERACTION_PORT || 3001}`,
    "/api/drug-interactions"
  )
);

// personalized advisory microservice (YOUR PART)
app.use(
  "/api/advisory",
  proxyTo(
    `http://localhost:${process.env.ADVISORY_PORT || 3002}`,
    "/api/advisory"
  )
);

// crossbrand comparator microservice
app.use(
  "/api/comparator",
  proxyTo(
    `http://localhost:${process.env.COMPARATOR_PORT || 3003}`,
    "/api/comparator"
  )
);

// prescription interpreter microservice
app.use(
  "/api/prescription",
  proxyTo(
    `http://localhost:${process.env.PRESCRIPTION_PORT || 3004}`,
    "/api/prescription"
  )
);

/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  logger.error(err.stack || err);
  res.status(500).json({
    error: "Something went wrong",
    message: process.env.NODE_ENV === "development" ? err.message : "Internal server error"
  });
});

/* =========================
   404 HANDLER
========================= */
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl
  });
});

/* =========================
   START SERVER
========================= */
const server = app.listen(PORT, () => {
  logger.info(`Pharmalink Backend Gateway running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down...");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  logger.info("SIGINT received. Shutting down...");
  server.close(() => process.exit(0));
});

module.exports = app;
