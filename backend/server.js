//backend/server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

// Load .env
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Local infra
const connectDB = require("./config/database");

// Logger fallback
let logger;
try {
  logger = require("./shared_infrastructure/logger");
} catch (e) {
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    stream: { write: (msg) => console.log(msg.trim()) },
  };
}

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8081",
  "http://10.130.51.238:8081",
  process.env.FRONTEND_URL,
  process.env.MOBILE_BASE_URL,
].filter(Boolean);

logger.info("Allowed CORS origins:");
allowedOrigins.forEach((origin) => logger.info(`- ${origin}`));

/* =========================
   SECURITY & CORE MIDDLEWARE
========================= */

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Requests like mobile app, Postman, curl may not send origin
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`CORS blocked for origin: ${origin}`);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
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
    legacyHeaders: false,
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

app.use("/api/users", userRoutes);

/* =========================
   HEALTH
========================= */
app.get("/health", async (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    port: PORT,
  });
});

/* =========================
   MICROSERVICE PROXIES
========================= */

function proxyTo(target, basePath) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: {
      [`^${basePath}`]: "",
    },
    proxyTimeout: 60000,
    timeout: 60000,
    onError(err, req, res) {
      logger.error(`[proxy error] ${basePath} -> ${target}: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({
          error: "Microservice unavailable",
          service: basePath,
          target,
          details: err.message,
        });
      }
    },
  });
}

// Drug interaction microservice
app.use(
  "/api/drug-interactions",
  proxyTo(
    `http://localhost:${process.env.DRUG_INTERACTION_PORT || 3001}`,
    "/api/drug-interactions"
  )
);

// Personalized advisory microservice
app.use(
  "/api/advisory",
  proxyTo(
    `http://localhost:${process.env.ADVISORY_PORT || 3002}`,
    "/api/advisory"
  )
);

// Cross-brand comparator microservice
app.use(
  "/api/comparator",
  proxyTo(
    `http://localhost:${process.env.COMPARATOR_PORT || 3003}`,
    "/api/comparator"
  )
);

// Prescription interpreter microservice
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
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

/* =========================
   404 HANDLER
========================= */
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

/* =========================
   START SERVER
========================= */
const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Pharmalink Backend Gateway running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
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