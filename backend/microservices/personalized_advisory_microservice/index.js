const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/database");

const app = express();
const PORT = process.env.PORT || 3002;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8081",
  "http://10.130.51.238:8081",
  process.env.FRONTEND_URL,
  process.env.MOBILE_WEB_URL,
  process.env.MOBILE_BASE_URL,
].filter(Boolean);

// middleware
app.use(helmet());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

// db
connectDB();

// routes
const interactionsRoutes = require("./routes/interactions");
app.use("/", interactionsRoutes);

// health
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "personalized_advisory_microservice",
    time: new Date().toISOString(),
  });
});

// start
app.listen(PORT, () => {
  console.log(`personalized_advisory_microservice running on port ${PORT}`);
  console.log("Allowed origins:", allowedOrigins);
});